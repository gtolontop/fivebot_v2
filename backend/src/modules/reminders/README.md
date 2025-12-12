# Reminders Module

Complete NestJS module for managing user reminders and scheduled messages.

## Overview

This module provides comprehensive functionality for:
- Creating and managing personal reminders
- Scheduling messages in channels
- Recurring reminders and scheduled messages
- Snoozing reminders
- Processing reminders via cron jobs

## File Structure

```
reminders/
├── dto/
│   ├── create-reminder.dto.ts          # DTO for creating reminders
│   ├── update-reminder.dto.ts          # DTO for updating reminders
│   ├── snooze-reminder.dto.ts          # DTO for snoozing reminders
│   ├── create-scheduled-message.dto.ts # DTO for creating scheduled messages
│   ├── update-scheduled-message.dto.ts # DTO for updating scheduled messages
│   ├── query-reminders.dto.ts          # DTO for pagination queries
│   └── index.ts                        # Export all DTOs
├── reminders.module.ts                 # Module definition
├── reminders.service.ts                # Service with business logic
├── reminders.controller.ts             # REST API endpoints
├── index.ts                            # Export module components
└── README.md                           # This file
```

## Service Methods

### Reminder Methods

#### `createReminder(botId, userId, content, remindAt, guildId?, channelId?, isRecurring?, interval?, repeatCount?, messageUrl?)`
Creates a new reminder for a user.
- **Returns**: `Promise<Reminder>`
- **Throws**: `BadRequestException` if reminder time is in the past or invalid recurring settings

#### `getReminder(reminderId)`
Gets a specific reminder by ID.
- **Returns**: `Promise<Reminder>`
- **Throws**: `NotFoundException` if reminder not found

#### `getUserReminders(userId, page?, limit?)`
Gets all reminders for a user with pagination.
- **Returns**: `Promise<{ reminders: Reminder[], total: number, page: number, totalPages: number }>`
- **Default**: page=1, limit=10

#### `updateReminder(reminderId, userId, data)`
Updates a reminder (only the owner can update).
- **Returns**: `Promise<Reminder>`
- **Throws**: `ForbiddenException` if user is not the owner, `BadRequestException` for invalid data

#### `deleteReminder(reminderId, userId)`
Deletes a reminder (only the owner can delete).
- **Returns**: `Promise<void>`
- **Throws**: `ForbiddenException` if user is not the owner

#### `snoozeReminder(reminderId, userId, durationMinutes)`
Snoozes a reminder for X minutes.
- **Returns**: `Promise<Reminder>`
- **Throws**: `ForbiddenException` if user is not the owner, `BadRequestException` if not pending

#### `getPendingReminders(botId)`
Gets all pending reminders that are due for processing (for cron jobs).
- **Returns**: `Promise<Reminder[]>`

#### `processReminder(reminderId)`
Processes a reminder - marks as sent or schedules next occurrence for recurring reminders.
- **Returns**: `Promise<Reminder>`

#### `cancelReminder(reminderId, userId)`
Cancels a reminder.
- **Returns**: `Promise<Reminder>`
- **Throws**: `ForbiddenException` if user is not the owner

#### `getUpcomingReminders(userId, limit?)`
Gets upcoming reminders for a user.
- **Returns**: `Promise<Reminder[]>`
- **Default**: limit=5

### Scheduled Message Methods

#### `createScheduledMessage(guildId, botId, channelId, creatorId, data)`
Creates a new scheduled message.
- **Returns**: `Promise<ScheduledMessage>`
- **Throws**: `BadRequestException` if invalid data (missing sendAt/cronExpression, missing content/embedJson, etc.)

#### `getScheduledMessages(guildId, page?, limit?)`
Gets scheduled messages for a guild with pagination.
- **Returns**: `Promise<{ messages: ScheduledMessage[], total: number, page: number, totalPages: number }>`
- **Default**: page=1, limit=10

#### `getScheduledMessage(messageId)`
Gets a specific scheduled message by ID.
- **Returns**: `Promise<ScheduledMessage>`
- **Throws**: `NotFoundException` if not found

#### `updateScheduledMessage(messageId, data)`
Updates a scheduled message.
- **Returns**: `Promise<ScheduledMessage>`
- **Throws**: `BadRequestException` for invalid data

#### `deleteScheduledMessage(messageId)`
Deletes a scheduled message.
- **Returns**: `Promise<void>`

#### `processScheduledMessages()`
Gets all scheduled messages that are due for processing (for cron jobs).
- **Returns**: `Promise<ScheduledMessage[]>`

#### `markScheduledMessageProcessed(messageId, success?, error?)`
Marks a scheduled message as processed and updates status/counters.
- **Returns**: `Promise<ScheduledMessage>`

#### `pauseScheduledMessage(messageId)`
Pauses a scheduled message.
- **Returns**: `Promise<ScheduledMessage>`

#### `resumeScheduledMessage(messageId)`
Resumes a paused scheduled message.
- **Returns**: `Promise<ScheduledMessage>`

## REST API Endpoints

### Reminder Endpoints

All reminder endpoints are prefixed with `/bots/:botId/reminders`

| Method | Endpoint | Description | Query Params | Body |
|--------|----------|-------------|--------------|------|
| GET | `/` | Get user reminders | `userId` (required), `page`, `limit` | - |
| POST | `/` | Create reminder | - | `CreateReminderDto` |
| GET | `/upcoming` | Get upcoming reminders | `userId` (required), `limit` | - |
| GET | `/:id` | Get specific reminder | - | - |
| PUT | `/:id` | Update reminder | `userId` (required) | `UpdateReminderDto` |
| DELETE | `/:id` | Delete reminder | `userId` (required) | - |
| POST | `/:id/snooze` | Snooze reminder | `userId` (required) | `SnoozeReminderDto` |
| POST | `/:id/cancel` | Cancel reminder | `userId` (required) | - |

### Scheduled Message Endpoints

All scheduled message endpoints are prefixed with `/bots/:botId/reminders/scheduled-messages`

| Method | Endpoint | Description | Query Params | Body |
|--------|----------|-------------|--------------|------|
| GET | `/` | Get guild scheduled messages | `guildId` (required), `page`, `limit` | - |
| POST | `/` | Create scheduled message | - | `CreateScheduledMessageDto` |
| GET | `/:id` | Get specific scheduled message | - | - |
| PUT | `/:id` | Update scheduled message | - | `UpdateScheduledMessageDto` |
| DELETE | `/:id` | Delete scheduled message | - | - |
| POST | `/:id/pause` | Pause scheduled message | - | - |
| POST | `/:id/resume` | Resume scheduled message | - | - |

## DTOs

### CreateReminderDto
```typescript
{
  userId: string;           // Required
  content: string;          // Required
  remindAt: string;         // Required (ISO date string)
  guildId?: string;         // Optional
  channelId?: string;       // Optional
  isRecurring?: boolean;    // Optional
  interval?: number;        // Optional (seconds)
  repeatCount?: number;     // Optional
  messageUrl?: string;      // Optional
}
```

### UpdateReminderDto
```typescript
{
  content?: string;
  remindAt?: string;        // ISO date string
  channelId?: string;
  isRecurring?: boolean;
  interval?: number;        // Seconds
  repeatCount?: number;
  status?: ReminderStatus;
}
```

### SnoozeReminderDto
```typescript
{
  durationMinutes: number;  // Required, minimum: 1
}
```

### CreateScheduledMessageDto
```typescript
{
  guildId: string;          // Required
  channelId: string;        // Required
  creatorId: string;        // Required
  content?: string;         // Optional (but content OR embedJson required)
  embedJson?: string;       // Optional (JSON as string)
  sendAt?: string;          // Optional (ISO date string, required if no cronExpression)
  cronExpression?: string;  // Optional (required if no sendAt)
  timezone?: string;        // Optional, default: "UTC"
  isRecurring?: boolean;    // Optional
  maxRuns?: number;         // Optional
}
```

### UpdateScheduledMessageDto
```typescript
{
  channelId?: string;
  content?: string;
  embedJson?: string;
  sendAt?: string;          // ISO date string
  cronExpression?: string;
  timezone?: string;
  isRecurring?: boolean;
  maxRuns?: number;
  status?: ScheduledMessageStatus;
}
```

## Enums

### ReminderStatus
```typescript
enum ReminderStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}
```

### ScheduledMessageStatus
```typescript
enum ScheduledMessageStatus {
  SCHEDULED = 'SCHEDULED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}
```

## Usage Examples

### Creating a Reminder
```typescript
POST /bots/bot-123/reminders
{
  "userId": "user-456",
  "content": "Take a break!",
  "remindAt": "2025-12-13T15:00:00Z",
  "guildId": "guild-789",
  "channelId": "channel-101"
}
```

### Creating a Recurring Reminder
```typescript
POST /bots/bot-123/reminders
{
  "userId": "user-456",
  "content": "Daily standup",
  "remindAt": "2025-12-13T09:00:00Z",
  "isRecurring": true,
  "interval": 86400,        // 24 hours in seconds
  "repeatCount": 30         // Repeat for 30 days
}
```

### Snoozing a Reminder
```typescript
POST /bots/bot-123/reminders/reminder-id/snooze?userId=user-456
{
  "durationMinutes": 15
}
```

### Creating a Scheduled Message
```typescript
POST /bots/bot-123/reminders/scheduled-messages
{
  "guildId": "guild-789",
  "channelId": "channel-101",
  "creatorId": "user-456",
  "content": "Daily announcement!",
  "sendAt": "2025-12-13T10:00:00Z"
}
```

### Creating a Recurring Scheduled Message (Cron)
```typescript
POST /bots/bot-123/reminders/scheduled-messages
{
  "guildId": "guild-789",
  "channelId": "channel-101",
  "creatorId": "user-456",
  "content": "Good morning!",
  "cronExpression": "0 9 * * *",  // Every day at 9 AM
  "timezone": "America/New_York",
  "isRecurring": true,
  "maxRuns": 100
}
```

## Integration with App Module

To use this module in your application, import it in `app.module.ts`:

```typescript
import { RemindersModule } from './modules/reminders';

@Module({
  imports: [
    // ... other imports
    RemindersModule,
  ],
})
export class AppModule {}
```

## Cron Job Integration

For processing reminders and scheduled messages, you'll need to create cron jobs that call:

```typescript
// In a cron service or scheduler
@Cron('*/1 * * * *') // Every minute
async processReminders() {
  const reminders = await this.remindersService.getPendingReminders(botId);

  for (const reminder of reminders) {
    // Send the reminder to Discord
    await this.discordService.sendReminder(reminder);

    // Mark as processed
    await this.remindersService.processReminder(reminder.id);
  }
}

@Cron('*/1 * * * *') // Every minute
async processScheduledMessages() {
  const messages = await this.remindersService.processScheduledMessages();

  for (const message of messages) {
    // Send the message to Discord
    await this.discordService.sendScheduledMessage(message);

    // Mark as processed
    await this.remindersService.markScheduledMessageProcessed(message.id);
  }
}
```

## Error Handling

All service methods throw appropriate NestJS exceptions:
- `NotFoundException`: When a resource is not found
- `ForbiddenException`: When a user tries to access/modify a resource they don't own
- `BadRequestException`: When invalid data is provided

## Notes

- All dates are stored and returned as ISO 8601 strings
- Recurring reminders use interval in seconds
- Scheduled messages support both one-time (sendAt) and recurring (cronExpression) modes
- The cron expression parser is not implemented in this module - you'll need to add a library like `cron-parser` for full cron functionality
- Remember to handle Discord API communication in a separate Discord service
