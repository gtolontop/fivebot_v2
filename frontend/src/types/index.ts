export interface User {
  id: string;
  discordId: string;
  username: string;
  email?: string;
  avatar?: string;
  role: UserRole;
  credits: number;
  createdAt: string;
  updatedAt: string;
}

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface Bot {
  id: string;
  ownerId: string;
  name: string;
  clientId?: string;
  prefix: string;
  isActive: boolean;
  containerId?: string;
  instanceId?: string;
  status: BotStatus;
  createdAt: string;
  updatedAt: string;
  config?: BotConfig;
  owner?: {
    id: string;
    username: string;
    discordId: string;
  };
  hosts?: Host[];
  jobLogs?: JobLog[];
  _count?: {
    jobLogs: number;
  };
}

export enum BotStatus {
  OFFLINE = 'OFFLINE',
  STARTING = 'STARTING',
  ONLINE = 'ONLINE',
  ERROR = 'ERROR',
  STOPPING = 'STOPPING',
}

/**
 * Discord Embed structure
 */
export interface EmbedJson {
  title?: string;
  description?: string;
  color?: number | string;
  thumbnail?: { url: string };
  image?: { url: string };
  footer?: { text: string; icon_url?: string };
  author?: { name: string; icon_url?: string; url?: string };
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp?: string;
}

/**
 * Custom command structure
 */
export interface CustomCommand {
  name: string;
  description?: string;
  response: string;
  embed?: EmbedJson;
  ephemeral?: boolean;
  enabled?: boolean;
}

export interface BotConfig {
  id: string;
  botId: string;
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: EmbedJson;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  autoRoleIds?: string[];
  loggingChannelId?: string;
  customCommands?: CustomCommand[];
  createdAt: string;
  updatedAt: string;
}

export interface Host {
  id: string;
  botId: string;
  host: string;
  containerId?: string;
  status: HostStatus;
  cpuLimit?: string;
  memLimit?: string;
  startedAt?: string;
  stoppedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export enum HostStatus {
  UP = 'UP',
  DOWN = 'DOWN',
  STARTING = 'STARTING',
  STOPPING = 'STOPPING',
  ERROR = 'ERROR',
}

export interface JobLog {
  id: string;
  botId?: string;
  jobId: string;
  jobType: string;
  status: JobStatus;
  message?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export enum JobStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface CreditsHistory {
  id: string;
  userId: string;
  amount: number;
  reason: string;
  type: CreditType;
  metadata?: Record<string, unknown>;
  createdAt: string;
  user?: {
    username: string;
  };
}

export enum CreditType {
  PURCHASE = 'PURCHASE',
  BONUS = 'BONUS',
  SPEND = 'SPEND',
  REFUND = 'REFUND',
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT',
}

export interface AuditLog {
  id: string;
  userId?: string;
  botId?: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    username: string;
  };
  bot?: {
    name: string;
  };
}

// API Response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  success: boolean;
}

// Form types
export interface CreateBotForm {
  name: string;
  token: string;
  prefix?: string;
}

export interface UpdateBotConfigForm {
  welcomeEnabled?: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: {
    title?: string;
    description?: string;
    color?: string;
    thumbnail?: {
      url?: string;
    };
    footer?: {
      text?: string;
    };
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
  };
  welcomeLogoUrl?: string;
  moderationEnabled?: boolean;
  autoRoleEnabled?: boolean;
  autoRoleId?: string;
  autoRoleIds?: string[];
  loggingChannelId?: string;
}

export interface UpdateUserForm {
  username?: string;
  email?: string;
  role?: UserRole;
}

export interface AddCreditsForm {
  amount: number;
  reason: string;
}

// Statistics types
export interface CreditStats {
  totalSpent: number;
  totalEarned: number;
  totalUsers: number;
  averageCreditsPerUser: number;
  topSpenders: Array<{
    userId: string;
    username: string;
    totalSpent: number;
  }>;
}

export interface DashboardStats {
  totalBots: number;
  activeBots: number;
  totalUsers: number;
  totalCreditsSpent: number;
  botsCreatedToday: number;
  usersJoinedToday: number;
}

// Collaboration types
export interface BotCollaborator {
  id: string;
  botId: string;
  userId: string;
  invitedBy: string;
  role: CollaboratorRole;
  permissions?: CollaboratorPermissions;
  status: CollaboratorStatus;
  invitedAt: string;
  acceptedAt?: string;
  lastAccessAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    username: string;
    discordId: string;
    avatar?: string;
  };
  inviter?: {
    id: string;
    username: string;
  };
}

export enum CollaboratorRole {
  VIEWER = 'VIEWER',
  MODERATOR = 'MODERATOR',
  DEVELOPER = 'DEVELOPER',
  ADMIN = 'ADMIN',
}

export enum CollaboratorStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

export interface CollaboratorPermissions {
  // Dashboard & Monitoring
  viewDashboard?: boolean;
  viewLogs?: boolean;
  viewAnalytics?: boolean;
  viewMetrics?: boolean;

  // Bot Control
  startBot?: boolean;
  stopBot?: boolean;
  restartBot?: boolean;

  // Configuration
  editWelcome?: boolean;
  editAutoRoles?: boolean;
  editModeration?: boolean;
  editLogging?: boolean;
  editCustomCommands?: boolean;
  editTicketSystem?: boolean;
  editStatusRotation?: boolean;
  editEmbedCommands?: boolean;

  // Ticket System
  viewTickets?: boolean;
  manageTickets?: boolean;
  closeTickets?: boolean;
  deleteTickets?: boolean;
  configureTickets?: boolean;

  // Categories Access
  allowedCategories?: string[]; // IDs des catégories accessibles

  // Advanced
  manageCollaborators?: boolean;
  deleteBot?: boolean;
}

export interface InviteCollaboratorForm {
  userDiscordId: string;
  role: CollaboratorRole;
  permissions?: Partial<CollaboratorPermissions>;
  message?: string;
}

// Dashboard layout types
export interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isActive?: boolean;
}

// Notification types
export enum NotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

// Log entry for real-time logs
export interface LogEntry {
  botId: string;
  line: string;
  timestamp: Date;
  level?: 'info' | 'warn' | 'error' | 'debug' | 'success';
  source?: string;
}

// Discord types
export interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
  memberCount?: number;
  permissions?: number;
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position?: number;
  parentId?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  managed: boolean;
}

// AI Types
export interface AIConfig {
  id: string;
  botId: string;
  enabled: boolean;
  model?: string;
  personality?: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  enabledChannels?: string[];
  requireMention?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIUsage {
  id: string;
  configId: string;
  tokensUsed: number;
  cost: number;
  model: string;
  createdAt: string;
}

// Ticket types
export interface Ticket {
  id: string;
  guildId: string;
  ticketNumber: number;
  channelId?: string;
  threadId?: string;
  creatorId: string;
  type: string;
  categoryId?: string;
  categoryName?: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  state: 'OPEN' | 'CLAIMED' | 'CLOSED' | 'LOCKED';
  activityState: 'ACTIVE' | 'INACTIVE' | 'WARNING';
  lastActivity?: string;
  createdAt: string;
  closedAt?: string;
  messageCount?: number;
}

export interface TicketCategory {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  color?: string;
  staffRoleIds?: string[];
  maxTicketsPerUser?: number;
  enabled: boolean;
}

export interface TicketPanel {
  id: string;
  channelId: string;
  messageId?: string;
  title: string;
  description?: string;
  color?: string;
  categoryIds?: string[];
  buttonLabel?: string;
  buttonEmoji?: string;
}