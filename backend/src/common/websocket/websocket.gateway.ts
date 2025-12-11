import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConsoleBufferService, LogEntry } from '../../bots/console-buffer.service';
import { Subscription } from 'rxjs';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  subscribedBots: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
@Injectable()
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('RealtimeGateway');
  private connectedClients = new Map<string, AuthenticatedSocket>();
  private botSubscribers = new Map<string, Set<string>>(); // botId -> Set<socketId>
  private logSubscription: Subscription;
  private statusSubscription: Subscription;

  constructor(
    private jwtService: JwtService,
    private consoleBufferService: ConsoleBufferService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Subscribe to log stream from ConsoleBufferService
    this.logSubscription = this.consoleBufferService.getLogStream().subscribe((entry) => {
      this.broadcastLogToSubscribers(entry);
    });

    // Subscribe to status changes
    this.statusSubscription = this.consoleBufferService.getStatusStream().subscribe((event) => {
      this.broadcastStatusToSubscribers(event.botId, event.status);
    });
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Get token from query or auth header
      const token = client.handshake.query.token as string ||
                   client.handshake.auth?.token ||
                   client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;
      client.subscribedBots = new Set();

      this.connectedClients.set(client.id, client);
      this.logger.log(`Client ${client.id} connected (user: ${client.userId})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to FiveBot realtime server',
        clientId: client.id,
        userId: client.userId,
      });
    } catch (error) {
      this.logger.warn(`Client ${client.id} failed authentication: ${error.message}`);
      client.emit('error', { message: 'Invalid token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Clean up subscriptions
    if (client.subscribedBots) {
      for (const botId of client.subscribedBots) {
        const subscribers = this.botSubscribers.get(botId);
        if (subscribers) {
          subscribers.delete(client.id);
          if (subscribers.size === 0) {
            this.botSubscribers.delete(botId);
          }
        }
      }
    }

    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * Subscribe to a bot's logs
   */
  @SubscribeMessage('subscribe:bot')
  handleSubscribeBot(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { botId: string },
  ) {
    const { botId } = data;

    if (!botId) {
      return { error: 'Bot ID required' };
    }

    // Add to subscriptions
    client.subscribedBots.add(botId);

    if (!this.botSubscribers.has(botId)) {
      this.botSubscribers.set(botId, new Set());
    }
    this.botSubscribers.get(botId)!.add(client.id);

    // Join the bot's room
    client.join(`bot:${botId}`);

    this.logger.log(`Client ${client.id} subscribed to bot ${botId}`);

    // Send current buffer content immediately
    const currentLogs = this.consoleBufferService.getStructuredBuffer(botId);
    const botStatus = this.consoleBufferService.getBotStatus(botId);

    return {
      success: true,
      botId,
      status: botStatus,
      logsCount: currentLogs.length,
      initialLogs: currentLogs.slice(-100), // Send last 100 logs
    };
  }

  /**
   * Unsubscribe from a bot's logs
   */
  @SubscribeMessage('unsubscribe:bot')
  handleUnsubscribeBot(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { botId: string },
  ) {
    const { botId } = data;

    client.subscribedBots.delete(botId);
    client.leave(`bot:${botId}`);

    const subscribers = this.botSubscribers.get(botId);
    if (subscribers) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.botSubscribers.delete(botId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from bot ${botId}`);

    return { success: true, botId };
  }

  /**
   * Get logs since a timestamp (for reconnection scenarios)
   */
  @SubscribeMessage('logs:since')
  handleLogsSince(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { botId: string; since: string },
  ) {
    const { botId, since } = data;

    if (!client.subscribedBots.has(botId)) {
      return { error: 'Not subscribed to this bot' };
    }

    const sinceDate = new Date(since);
    const logs = this.consoleBufferService.getLogsSince(botId, sinceDate);

    return {
      success: true,
      botId,
      logs,
      count: logs.length,
    };
  }

  /**
   * Get full log buffer
   */
  @SubscribeMessage('logs:full')
  handleLogsFull(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { botId: string; limit?: number },
  ) {
    const { botId, limit = 500 } = data;

    if (!client.subscribedBots.has(botId)) {
      return { error: 'Not subscribed to this bot' };
    }

    const logs = this.consoleBufferService.getStructuredBuffer(botId);
    const status = this.consoleBufferService.getBotStatus(botId);

    return {
      success: true,
      botId,
      status,
      logs: logs.slice(-limit),
      totalCount: logs.length,
    };
  }

  /**
   * Ping to keep connection alive
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return { event: 'pong', timestamp: new Date().toISOString() };
  }

  /**
   * Broadcast a log entry to all subscribers of a bot
   */
  private broadcastLogToSubscribers(entry: LogEntry) {
    const subscribers = this.botSubscribers.get(entry.botId);
    if (subscribers && subscribers.size > 0) {
      this.server.to(`bot:${entry.botId}`).emit('log', entry);
    }
  }

  /**
   * Broadcast status change to all subscribers
   */
  private broadcastStatusToSubscribers(botId: string, status: string) {
    this.server.to(`bot:${botId}`).emit('status', { botId, status, timestamp: new Date() });
  }

  /**
   * External method to emit logs (called from other services)
   */
  emitLog(entry: LogEntry) {
    this.broadcastLogToSubscribers(entry);
  }

  /**
   * External method to emit status changes
   */
  emitStatus(botId: string, status: string) {
    this.broadcastStatusToSubscribers(botId, status);
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get subscribers for a bot
   */
  getBotSubscribersCount(botId: string): number {
    return this.botSubscribers.get(botId)?.size || 0;
  }

  onModuleDestroy() {
    if (this.logSubscription) {
      this.logSubscription.unsubscribe();
    }
    if (this.statusSubscription) {
      this.statusSubscription.unsubscribe();
    }
  }
}
