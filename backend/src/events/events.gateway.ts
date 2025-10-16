import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  emitBotStatus(botId: string, status: string) {
    this.server.emit('bot-status', { botId, status });
  }
}
