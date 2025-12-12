# Giveaway Module

A complete NestJS module for managing Discord bot giveaways with advanced features like requirements checking, bonus entries, winner selection, and scheduled processing.

## Features

- **Comprehensive Giveaway Management**: Create, update, pause, resume, end, and cancel giveaways
- **Entry Requirements**: Support for role requirements, level requirements, and message count requirements
- **Bonus Entries**: Weighted winner selection based on bonus roles
- **Winner Selection**: Random selection with support for rerolling
- **Scheduled Processing**: Automatic start and end of scheduled giveaways
- **Pagination**: Paginated endpoints for ended giveaways
- **Full CRUD Operations**: Complete REST API for all giveaway operations

## Module Structure

```
giveaway/
├── dto/
│   ├── create-giveaway.dto.ts    - DTO for creating giveaways
│   ├── update-giveaway.dto.ts    - DTO for updating giveaways
│   ├── update-config.dto.ts      - DTO for updating guild config
│   └── reroll-giveaway.dto.ts    - DTO for rerolling winners
├── giveaway.controller.ts        - REST API endpoints
├── giveaway.service.ts           - Business logic and database operations
├── giveaway.module.ts            - NestJS module definition
├── index.ts                      - Module exports
└── README.md                     - This file
```

## Database Models

This module uses three Prisma models:

- **GiveawayConfig**: Guild-level configuration for giveaway settings
- **Giveaway**: Individual giveaway instances
- **GiveawayEntry**: User entries in giveaways

## API Endpoints

### Configuration

#### Get Configuration
```
GET /bots/:botId/giveaways/config?guildId={guildId}
```
Retrieve giveaway configuration for a guild.

#### Update Configuration
```
PUT /bots/:botId/giveaways/config?guildId={guildId}
Body: UpdateConfigDto
```
Update or create giveaway configuration for a guild.

### Giveaway Management

#### List Giveaways
```
GET /bots/:botId/giveaways?guildId={guildId}&status={active|ended}&page={page}&limit={limit}
```
List active or ended giveaways for a guild.

#### Create Giveaway
```
POST /bots/:botId/giveaways?guildId={guildId}
Body: CreateGiveawayDto
```
Create a new giveaway.

#### Get Giveaway
```
GET /bots/:botId/giveaways/:giveawayId
```
Retrieve a specific giveaway by ID.

#### Update Giveaway
```
PUT /bots/:botId/giveaways/:giveawayId
Body: UpdateGiveawayDto
```
Update an existing giveaway (only for active giveaways).

#### Cancel Giveaway
```
DELETE /bots/:botId/giveaways/:giveawayId
```
Cancel a giveaway.

### Giveaway Actions

#### End Giveaway
```
POST /bots/:botId/giveaways/:giveawayId/end
```
Manually end a giveaway and pick winners.

#### Pause Giveaway
```
POST /bots/:botId/giveaways/:giveawayId/pause
```
Pause an active giveaway.

#### Resume Giveaway
```
POST /bots/:botId/giveaways/:giveawayId/resume
```
Resume a paused giveaway.

#### Reroll Giveaway
```
POST /bots/:botId/giveaways/:giveawayId/reroll
Body: RerollGiveawayDto
```
Reroll a giveaway to pick new winners.

### Entry Management

#### Get Entries
```
GET /bots/:botId/giveaways/:giveawayId/entries
```
List all entries for a giveaway.

#### Enter Giveaway
```
POST /bots/:botId/giveaways/:giveawayId/enter
Body: { userId: string }
```
Enter a user into a giveaway.

#### Leave Giveaway
```
POST /bots/:botId/giveaways/:giveawayId/leave
Body: { userId: string }
```
Remove a user from a giveaway.

#### Check Requirements
```
POST /bots/:botId/giveaways/:giveawayId/check-requirements
Body: {
  userId: string,
  userRoles?: string[],
  userLevel?: number,
  userMessages?: number
}
```
Check if a user meets the requirements to enter a giveaway.

## Service Methods

### Configuration
- `getConfig(guildId)` - Get guild configuration
- `updateConfig(guildId, botId, data)` - Update guild configuration

### Giveaway Management
- `createGiveaway(guildId, botId, data)` - Create new giveaway
- `updateGiveaway(giveawayId, data)` - Update giveaway
- `endGiveaway(giveawayId)` - End and pick winners
- `cancelGiveaway(giveawayId)` - Cancel giveaway
- `pauseGiveaway(giveawayId)` - Pause giveaway
- `resumeGiveaway(giveawayId)` - Resume giveaway
- `rerollGiveaway(giveawayId, winnersCount)` - Reroll winners

### Entries
- `enterGiveaway(giveawayId, userId)` - Enter user
- `leaveGiveaway(giveawayId, userId)` - Remove user
- `getGiveawayEntries(giveawayId)` - Get all entries

### Queries
- `getGiveaway(giveawayId)` - Get single giveaway
- `getActiveGiveaways(guildId)` - Get active giveaways
- `getEndedGiveaways(guildId, page, limit)` - Get ended giveaways with pagination

### Requirements & Winners
- `checkRequirements(giveawayId, userId, userRoles, userLevel, userMessages)` - Check eligibility
- `pickWinners(giveawayId, count, excludePrevious)` - Pick random winners with bonus entries

### Scheduled Processing
- `processScheduledGiveaways()` - Process scheduled starts and ends (for cron jobs)

## Usage Example

```typescript
import { GiveawayModule } from './modules/giveaway';

@Module({
  imports: [GiveawayModule],
  // ...
})
export class AppModule {}
```

### Creating a Giveaway

```typescript
const giveaway = await giveawayService.createGiveaway(guildId, botId, {
  guildId: '123456789',
  channelId: '987654321',
  hostId: '111222333',
  prize: 'Discord Nitro',
  description: 'Win a month of Discord Nitro!',
  winnersCount: 3,
  duration: 86400, // 24 hours
  requiredRoleIds: ['444555666'],
  bonusRoles: {
    '777888999': 5, // Users with this role get 5 entries
  },
});
```

### Entering a Giveaway

```typescript
const entry = await giveawayService.enterGiveaway(giveawayId, userId);
```

### Ending a Giveaway

```typescript
const result = await giveawayService.endGiveaway(giveawayId);
console.log('Winners:', result.winners);
```

### Setting up Cron Job

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class GiveawayScheduler {
  constructor(private readonly giveawayService: GiveawayService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledGiveaways() {
    await this.giveawayService.processScheduledGiveaways();
  }
}
```

## Features Detail

### Requirements System
Giveaways can have multiple requirements:
- **Required Roles**: User must have at least one of the specified roles
- **Blacklisted Roles**: User cannot have any of the blacklisted roles
- **Required Level**: User must be at or above the specified level
- **Required Messages**: User must have sent at least the specified number of messages

### Bonus Entries System
Users with specific roles can receive bonus entries, increasing their chances of winning:
```json
{
  "bonusRoles": {
    "roleId1": 2,  // 2x entries
    "roleId2": 5,  // 5x entries
    "roleId3": 10  // 10x entries
  }
}
```

### Winner Selection
Winners are selected using a weighted random algorithm:
1. Each entry is weighted by their bonus entries
2. A random selection is made from the weighted pool
3. Selected winners are excluded from subsequent selections
4. Process continues until all winners are selected or pool is exhausted

### Giveaway States
- **SCHEDULED**: Giveaway created but not yet started
- **ACTIVE**: Giveaway is running and accepting entries
- **ENDED**: Giveaway has ended and winners have been selected
- **CANCELLED**: Giveaway was cancelled before completion
- **REROLLING**: Temporary state during winner reroll

### Paused State
Active giveaways can be paused temporarily:
- Users cannot enter or leave while paused
- End time is not affected
- Can be resumed at any time

## Error Handling

The service throws appropriate exceptions:
- `NotFoundException`: Resource not found
- `BadRequestException`: Invalid operation or data
- `ConflictException`: Duplicate entry or conflict

All exceptions include descriptive messages for debugging.

## Dependencies

- `@nestjs/common`: NestJS core functionality
- `@nestjs/swagger`: API documentation
- `@prisma/client`: Database access
- `class-validator`: DTO validation
- PrismaService: Custom Prisma service from common module

## License

Part of the FiveBot v2 project.
