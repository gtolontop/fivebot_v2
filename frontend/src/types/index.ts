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

export interface BotConfig {
  id: string;
  botId: string;
  welcomeEnabled: boolean;
  welcomeChannelId?: string;
  welcomeEmbedJson?: any;
  welcomeLogoUrl?: string;
  moderationEnabled: boolean;
  autoRoleEnabled: boolean;
  autoRoleId?: string;
  loggingChannelId?: string;
  customCommands?: any;
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
  metadata?: any;
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
  metadata?: any;
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
  metadata?: any;
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

export interface ApiResponse<T = any> {
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

// Dashboard layout types
export interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isActive?: boolean;
}