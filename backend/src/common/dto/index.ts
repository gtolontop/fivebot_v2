import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  IsObject,
  MinLength,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CollaboratorRole } from '@prisma/client';

/**
 * Embed field structure
 */
export class EmbedFieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsOptional()
  @IsBoolean()
  inline?: boolean;
}

/**
 * Embed thumbnail/image structure
 */
export class EmbedImageDto {
  @IsString()
  url: string;
}

/**
 * Embed footer structure
 */
export class EmbedFooterDto {
  @IsString()
  text: string;

  @IsOptional()
  @IsString()
  icon_url?: string;
}

/**
 * Embed author structure
 */
export class EmbedAuthorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  icon_url?: string;

  @IsOptional()
  @IsString()
  url?: string;
}

/**
 * Discord Embed JSON DTO
 */
export class EmbedJsonDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(16777215)
  color?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedImageDto)
  thumbnail?: EmbedImageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedImageDto)
  image?: EmbedImageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedFooterDto)
  footer?: EmbedFooterDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedAuthorDto)
  author?: EmbedAuthorDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmbedFieldDto)
  fields?: EmbedFieldDto[];

  @IsOptional()
  @IsString()
  timestamp?: string;
}

/**
 * Create Bot DTO with validation
 */
export class CreateBotDto {
  @IsString()
  @IsNotEmpty({ message: 'Bot name is required' })
  @MinLength(1, { message: 'Bot name must be at least 1 character' })
  @MaxLength(32, { message: 'Bot name must be at most 32 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Bot token is required' })
  @MinLength(50, { message: 'Invalid bot token format' })
  token: string;
}

/**
 * Custom Command DTO
 */
export class CustomCommandDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(32)
  @Transform(({ value }) => value?.toLowerCase().replace(/\s+/g, '-'))
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  response: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedJsonDto)
  embed?: EmbedJsonDto;

  @IsOptional()
  @IsBoolean()
  ephemeral?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

/**
 * Update Bot Config DTO with validation
 */
export class UpdateBotConfigDto {
  // Welcome settings
  @IsOptional()
  @IsBoolean()
  welcomeEnabled?: boolean;

  @IsOptional()
  @IsString()
  welcomeChannelId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmbedJsonDto)
  welcomeEmbedJson?: EmbedJsonDto;

  @IsOptional()
  @IsString()
  welcomeLogoUrl?: string;

  @IsOptional()
  @IsString()
  welcomeThumbnailUrl?: string;

  // Goodbye settings
  @IsOptional()
  @IsBoolean()
  goodbyeEnabled?: boolean;

  @IsOptional()
  @IsString()
  goodbyeChannelId?: string;

  // Moderation
  @IsOptional()
  @IsBoolean()
  moderationEnabled?: boolean;

  // Auto-role
  @IsOptional()
  @IsBoolean()
  autoRoleEnabled?: boolean;

  @IsOptional()
  @IsString()
  autoRoleId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  autoRoleIds?: string[];

  // Logging
  @IsOptional()
  @IsString()
  loggingChannelId?: string;

  // Custom commands
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomCommandDto)
  customCommands?: CustomCommandDto[];

  // Ticket system
  @IsOptional()
  @IsBoolean()
  ticketEnabled?: boolean;

  @IsOptional()
  @IsString()
  ticketCategoryId?: string;

  @IsOptional()
  @IsString()
  ticketStaffRoleId?: string;

  @IsOptional()
  @IsString()
  ticketTranscriptChannelId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ticketNamingFormat?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(25)
  maxTicketsPerUser?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(168)
  autoCloseHours?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(48)
  inactivityWarningHours?: number;

  @IsOptional()
  @IsBoolean()
  ticketThreads?: boolean;

  @IsOptional()
  @IsBoolean()
  ticketMentionStaff?: boolean;

  @IsOptional()
  @IsBoolean()
  ticketDMNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  ticketRequireReason?: boolean;

  @IsOptional()
  @IsBoolean()
  autoSaveTranscripts?: boolean;

  @IsOptional()
  @IsBoolean()
  sendTranscriptToUser?: boolean;

  @IsOptional()
  @IsBoolean()
  includeAttachments?: boolean;

  @IsOptional()
  @IsBoolean()
  autoWelcomeEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  autoWelcomeMessage?: string;

  @IsOptional()
  @IsBoolean()
  inactivityWarningEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  inactivityWarningMessage?: string;

  @IsOptional()
  @IsBoolean()
  autoAssignStaff?: boolean;

  @IsOptional()
  @IsBoolean()
  autoTagUrgent?: boolean;

  @IsOptional()
  @IsBoolean()
  autoEscalate?: boolean;

  // Status rotation
  @IsOptional()
  @IsString()
  statusRotation?: string;

  // Embed commands
  @IsOptional()
  @IsString()
  embedV2Commands?: string;
}

/**
 * Collaborator permissions DTO
 */
export class CollaboratorPermissionsDto {
  @IsOptional()
  @IsBoolean()
  canStart?: boolean;

  @IsOptional()
  @IsBoolean()
  canStop?: boolean;

  @IsOptional()
  @IsBoolean()
  canRestart?: boolean;

  @IsOptional()
  @IsBoolean()
  canEditConfig?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewLogs?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageCommands?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageTickets?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageWelcome?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageModules?: boolean;

  @IsOptional()
  @IsBoolean()
  canInviteCollaborators?: boolean;

  @IsOptional()
  @IsBoolean()
  canRemoveCollaborators?: boolean;

  @IsOptional()
  @IsBoolean()
  canViewMetrics?: boolean;

  @IsOptional()
  @IsBoolean()
  canManageAI?: boolean;
}

/**
 * Invite Collaborator DTO with validation
 */
export class InviteCollaboratorDto {
  @IsString()
  @IsNotEmpty({ message: 'Discord ID is required' })
  userDiscordId: string;

  @IsEnum(CollaboratorRole, { message: 'Invalid collaborator role' })
  role: CollaboratorRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => CollaboratorPermissionsDto)
  permissions?: CollaboratorPermissionsDto;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

/**
 * Update Collaborator DTO with validation
 */
export class UpdateCollaboratorDto {
  @IsOptional()
  @IsEnum(CollaboratorRole)
  role?: CollaboratorRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => CollaboratorPermissionsDto)
  permissions?: CollaboratorPermissionsDto;

  @IsOptional()
  @IsEnum(['ACTIVE', 'SUSPENDED', 'REVOKED'])
  status?: 'ACTIVE' | 'SUSPENDED' | 'REVOKED';
}

/**
 * AI Config DTO with validation
 */
export class AIConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  responseMode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  customPersonality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  systemPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  dmSystemPrompt?: string;

  @IsOptional()
  @IsObject()
  channelPrompts?: Record<string, string>;

  @IsOptional()
  @IsObject()
  threadPrompts?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  enableVision?: boolean;

  @IsOptional()
  @IsBoolean()
  includeUserContext?: boolean;

  @IsOptional()
  @IsBoolean()
  includeChannelContext?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4096)
  maxTokens?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledChannels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabledChannels?: string[];

  @IsOptional()
  @IsBoolean()
  enableInTickets?: boolean;

  @IsOptional()
  @IsBoolean()
  enableInThreads?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  triggerKeywords?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ignorePrefixes?: string[];

  @IsOptional()
  @IsBoolean()
  requireMention?: boolean;

  @IsOptional()
  @IsBoolean()
  typingIndicator?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  responseDelay?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(4000)
  maxResponseLength?: number;

  @IsOptional()
  @IsBoolean()
  useEmbeds?: boolean;

  @IsOptional()
  @IsString()
  embedColor?: string;

  @IsOptional()
  @IsBoolean()
  showThinking?: boolean;

  @IsOptional()
  @IsBoolean()
  conversationHistory?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  contextWindow?: number;

  @IsOptional()
  @IsBoolean()
  useRAG?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  rateLimitPerUser?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  rateLimitPerChannel?: number;

  @IsOptional()
  @IsBoolean()
  blockNSFW?: boolean;

  @IsOptional()
  @IsBoolean()
  contentFilter?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyTokenLimit?: number;

  @IsOptional()
  @IsBoolean()
  alertOnLimit?: boolean;

  @IsOptional()
  @IsString()
  alertChannelId?: string;

  @IsOptional()
  @IsBoolean()
  functionCalling?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFunctions?: string[];

  @IsOptional()
  @IsBoolean()
  logConversations?: boolean;
}

/**
 * AI Document DTO with validation
 */
export class AIDocumentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

/**
 * Update Token DTO
 */
export class UpdateTokenDto {
  @IsString()
  @IsNotEmpty({ message: 'Bot token is required' })
  @MinLength(50, { message: 'Invalid bot token format' })
  token: string;
}

/**
 * Pagination Query DTO
 */
export class PaginationQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * Add Credits DTO
 */
export class AddCreditsDto {
  @IsNumber()
  @Min(-1000000)
  @Max(1000000)
  amount: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

/**
 * Update User Role DTO
 */
export class UpdateUserRoleDto {
  @IsEnum(['USER', 'ADMIN', 'SUPER_ADMIN'])
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
}
