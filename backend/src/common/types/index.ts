import { Request } from 'express';
import { UserRole, CollaboratorRole } from '@prisma/client';

/**
 * Authenticated user attached to request by JWT strategy
 */
export interface AuthenticatedUser {
  id: string;
  discordId: string;
  username: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  credits: number;
}

/**
 * Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

/**
 * Collaborator permissions granular structure
 */
export interface CollaboratorPermissions {
  canStart: boolean;
  canStop: boolean;
  canRestart: boolean;
  canEditConfig: boolean;
  canViewLogs: boolean;
  canManageCommands: boolean;
  canManageTickets: boolean;
  canManageWelcome: boolean;
  canManageModules: boolean;
  canInviteCollaborators: boolean;
  canRemoveCollaborators: boolean;
  canViewMetrics: boolean;
  canManageAI: boolean;
}

/**
 * Bot state stored in Redis
 */
export interface BotState {
  status: string;
  userAction: 'start' | 'stop' | 'restart' | 'crash';
  timestamp: Date;
  metadata?: {
    pid?: number;
    confirmed?: boolean;
    crashCount?: number;
    lastCrashTime?: string;
    error?: string;
    phase?: string;
    shouldRecover?: boolean;
    intentional?: boolean;
    alreadyRunning?: boolean;
    resynchronized?: boolean;
    exitCode?: number | null;
    signal?: string | null;
  };
}

/**
 * Bot metadata stored in Redis
 */
export interface BotMetadata {
  pid?: number;
  startedAt?: Date;
}

/**
 * Webhook/Embed JSON structure
 */
export interface EmbedJson {
  title?: string;
  description?: string;
  color?: number;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string; icon_url?: string };
  author?: { name: string; icon_url?: string; url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Job data for queue
 */
export interface JobData {
  botId: string;
  userId?: string;
  action?: string;
  config?: Record<string, unknown>;
}

/**
 * Log entry structure
 */
export interface LogEntry {
  botId: string;
  line: string;
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  source: string;
}

/**
 * Discord Guild basic info
 */
export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  memberCount?: number;
}

/**
 * AI Configuration DTO
 */
export interface AIConfigDto {
  enabled?: boolean;
  apiKey?: string;
  model?: string;
  responseMode?: string;
  personality?: string;
  customPersonality?: string;
  systemPrompt?: string;
  dmSystemPrompt?: string;
  channelPrompts?: Record<string, string>;
  threadPrompts?: Record<string, string>;
  enableVision?: boolean;
  includeUserContext?: boolean;
  includeChannelContext?: boolean;
  temperature?: number;
  maxTokens?: number;
  enabledChannels?: string[];
  disabledChannels?: string[];
  enableInTickets?: boolean;
  enableInThreads?: boolean;
  triggerKeywords?: string[];
  ignorePrefixes?: string[];
  requireMention?: boolean;
  typingIndicator?: boolean;
  responseDelay?: number;
  maxResponseLength?: number;
  useEmbeds?: boolean;
  embedColor?: string;
  showThinking?: boolean;
  conversationHistory?: boolean;
  contextWindow?: number;
  useRAG?: boolean;
  rateLimitPerUser?: number;
  rateLimitPerChannel?: number;
  blockNSFW?: boolean;
  contentFilter?: boolean;
  monthlyTokenLimit?: number;
  alertOnLimit?: boolean;
  alertChannelId?: string;
  functionCalling?: boolean;
  allowedFunctions?: string[];
  logConversations?: boolean;
}

/**
 * AI Document DTO
 */
export interface AIDocumentDto {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
}

/**
 * Invite Collaborator DTO
 */
export interface InviteCollaboratorDto {
  userDiscordId: string;
  role: CollaboratorRole;
  permissions?: CollaboratorPermissions;
  message?: string;
}

/**
 * Update Collaborator DTO
 */
export interface UpdateCollaboratorDto {
  role?: CollaboratorRole;
  permissions?: CollaboratorPermissions;
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}

/**
 * Create Bot DTO
 */
export interface CreateBotDto {
  name: string;
  token: string;
}

/**
 * Custom Command structure
 */
export interface CustomCommand {
  name: string;
  description?: string;
  response: string;
  embed?: EmbedJson;
  ephemeral?: boolean;
  enabled?: boolean;
}

/**
 * Update Bot Config DTO
 */
export interface UpdateBotConfigDto {
  welcomeEnabled?: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: EmbedJson;
  welcomeLogoUrl?: string;
  welcomeThumbnailUrl?: string;
  goodbyeEnabled?: boolean;
  goodbyeChannelId?: string;
  moderationEnabled?: boolean;
  autoRoleEnabled?: boolean;
  autoRoleId?: string;
  autoRoleIds?: string[];
  loggingChannelId?: string;
  customCommands?: CustomCommand[];
  ticketEnabled?: boolean;
  ticketCategoryId?: string;
  ticketStaffRoleId?: string;
  ticketTranscriptChannelId?: string;
  ticketNamingFormat?: string;
  maxTicketsPerUser?: number;
  autoCloseHours?: number;
  inactivityWarningHours?: number;
  ticketThreads?: boolean;
  ticketMentionStaff?: boolean;
  ticketDMNotifications?: boolean;
  ticketRequireReason?: boolean;
  autoSaveTranscripts?: boolean;
  sendTranscriptToUser?: boolean;
  includeAttachments?: boolean;
  autoWelcomeEnabled?: boolean;
  autoWelcomeMessage?: string;
  inactivityWarningEnabled?: boolean;
  inactivityWarningMessage?: string;
  autoAssignStaff?: boolean;
  autoTagUrgent?: boolean;
  autoEscalate?: boolean;
  statusRotation?: string;
  embedV2Commands?: string;
}
