import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CollaboratorsService } from '../../bots/collaborators.service';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint
 * Usage: @RequirePermissions('startBot', 'stopBot')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Guard that checks if user has required permissions for a bot
 * Expects 'botId' to be in route params and 'user' to be set by JWT guard
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private collaboratorsService: CollaboratorsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions specified, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const botId = request.params.id || request.params.botId || request.body?.botId;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (!botId) {
      throw new ForbiddenException('Bot ID required');
    }

    // Check if user has access to bot at all
    const hasAccess = await this.collaboratorsService.hasAccessToBot(botId, user.id);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this bot');
    }

    // Check specific permissions
    for (const permission of requiredPermissions) {
      const hasPermission = await this.collaboratorsService.checkPermission(
        botId,
        user.id,
        permission,
      );

      if (!hasPermission) {
        throw new ForbiddenException(
          `Missing permission: ${permission}. Contact the bot owner to request access.`,
        );
      }
    }

    // Update last access time
    await this.collaboratorsService.updateLastAccess(botId, user.id);

    return true;
  }
}

/**
 * Pre-defined permission sets for common operations
 */
export const Permissions = {
  // Bot control
  START_BOT: 'startBot',
  STOP_BOT: 'stopBot',
  RESTART_BOT: 'restartBot',

  // View permissions
  VIEW_DASHBOARD: 'viewDashboard',
  VIEW_LOGS: 'viewLogs',
  VIEW_ANALYTICS: 'viewAnalytics',
  VIEW_METRICS: 'viewMetrics',

  // Configuration
  EDIT_WELCOME: 'editWelcome',
  EDIT_AUTO_ROLES: 'editAutoRoles',
  EDIT_MODERATION: 'editModeration',
  EDIT_LOGGING: 'editLogging',
  EDIT_CUSTOM_COMMANDS: 'editCustomCommands',
  EDIT_TICKET_SYSTEM: 'editTicketSystem',
  EDIT_STATUS_ROTATION: 'editStatusRotation',
  EDIT_EMBED_COMMANDS: 'editEmbedCommands',

  // Tickets
  VIEW_TICKETS: 'viewTickets',
  MANAGE_TICKETS: 'manageTickets',
  CLOSE_TICKETS: 'closeTickets',
  DELETE_TICKETS: 'deleteTickets',
  CONFIGURE_TICKETS: 'configureTickets',

  // Admin
  MANAGE_COLLABORATORS: 'manageCollaborators',
  DELETE_BOT: 'deleteBot',
};

/**
 * Default permissions for each role
 */
export const RolePermissions: Record<string, string[]> = {
  VIEWER: [
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_LOGS,
    Permissions.VIEW_ANALYTICS,
    Permissions.VIEW_METRICS,
  ],
  MODERATOR: [
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_LOGS,
    Permissions.VIEW_ANALYTICS,
    Permissions.VIEW_METRICS,
    Permissions.VIEW_TICKETS,
    Permissions.MANAGE_TICKETS,
    Permissions.CLOSE_TICKETS,
  ],
  DEVELOPER: [
    Permissions.VIEW_DASHBOARD,
    Permissions.VIEW_LOGS,
    Permissions.VIEW_ANALYTICS,
    Permissions.VIEW_METRICS,
    Permissions.START_BOT,
    Permissions.STOP_BOT,
    Permissions.RESTART_BOT,
    Permissions.EDIT_WELCOME,
    Permissions.EDIT_AUTO_ROLES,
    Permissions.EDIT_MODERATION,
    Permissions.EDIT_LOGGING,
    Permissions.EDIT_CUSTOM_COMMANDS,
    Permissions.EDIT_TICKET_SYSTEM,
    Permissions.EDIT_STATUS_ROTATION,
    Permissions.EDIT_EMBED_COMMANDS,
    Permissions.VIEW_TICKETS,
    Permissions.MANAGE_TICKETS,
    Permissions.CLOSE_TICKETS,
    Permissions.CONFIGURE_TICKETS,
  ],
  ADMIN: [
    // All permissions
    ...Object.values(Permissions),
  ],
};
