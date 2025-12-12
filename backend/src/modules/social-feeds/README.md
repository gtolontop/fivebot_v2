# Social Feeds Module

A comprehensive NestJS module for managing social media feed notifications in Discord bots.

## Features

- **Multi-Platform Support**: YouTube, Twitch, Twitter/X, and RSS feeds
- **Configurable Notifications**: Custom messages, embeds, and role mentions
- **Content Filtering**: Include/exclude keywords
- **Error Handling**: Automatic error tracking and recovery
- **Statistics**: Comprehensive feed statistics and monitoring
- **Cron Integration**: Built-in support for scheduled feed checking

## Module Structure

```
social-feeds/
├── dto/                          # Data Transfer Objects
│   ├── create-feed.dto.ts       # DTO for creating feeds
│   ├── update-feed.dto.ts       # DTO for updating feeds
│   ├── update-config.dto.ts     # DTO for config updates
│   ├── toggle-feed.dto.ts       # DTO for toggling feeds
│   └── index.ts                 # DTO exports
├── platforms/                    # Platform-specific services
│   ├── youtube.service.ts       # YouTube integration
│   ├── twitch.service.ts        # Twitch integration
│   ├── twitter.service.ts       # Twitter/X integration
│   ├── rss.service.ts          # RSS feed integration
│   └── index.ts                 # Platform service exports
├── social-feeds.controller.ts   # REST API endpoints
├── social-feeds.service.ts      # Main business logic
├── social-feeds.module.ts       # NestJS module definition
└── index.ts                     # Module exports
```

## API Endpoints

### Configuration

#### Get Configuration
```http
GET /bots/:botId/social-feeds/config?guildId={guildId}
```

#### Update Configuration
```http
PUT /bots/:botId/social-feeds/config?guildId={guildId}
Body: { enabled: boolean }
```

### Feed Management

#### Get All Feeds
```http
GET /bots/:botId/social-feeds?guildId={guildId}
```

#### Create Feed
```http
POST /bots/:botId/social-feeds?guildId={guildId}
Body: CreateFeedDto
```

#### Get Single Feed
```http
GET /bots/:botId/social-feeds/:feedId
```

#### Update Feed
```http
PUT /bots/:botId/social-feeds/:feedId
Body: UpdateFeedDto
```

#### Delete Feed
```http
DELETE /bots/:botId/social-feeds/:feedId
```

#### Toggle Feed
```http
POST /bots/:botId/social-feeds/:feedId/toggle
Body: { isActive: boolean }
```

### Feed Operations

#### Test Feed
```http
POST /bots/:botId/social-feeds/:feedId/test
```

#### Check Feed Manually
```http
POST /bots/:botId/social-feeds/:feedId/check
```

#### Get Statistics
```http
GET /bots/:botId/social-feeds/statistics?guildId={guildId}
```

## Service Methods

### Configuration Methods

- `getConfig(guildId: string)` - Get guild configuration
- `updateConfig(guildId: string, botId: string, enabled: boolean)` - Update configuration

### Feed Management Methods

- `getFeeds(guildId: string)` - Get all feeds for a guild
- `getFeed(feedId: string)` - Get a specific feed
- `createFeed(guildId: string, botId: string, data: CreateFeedDto)` - Create a new feed
- `updateFeed(feedId: string, data: UpdateFeedDto)` - Update a feed
- `deleteFeed(feedId: string)` - Delete a feed
- `toggleFeed(feedId: string, isActive: boolean)` - Toggle feed status

### Feed Operations

- `testFeed(feedId: string)` - Send a test notification
- `checkFeed(feedId: string)` - Check for new content
- `processAllFeeds()` - Process all active feeds (for cron jobs)
- `getStatistics(guildId: string)` - Get feed statistics

## Platform Services

### YouTube Service
```typescript
// Check for new videos
await youtubeService.checkForNewVideos(channelId, lastVideoId);

// Get channel info
await youtubeService.getChannelInfo(channelId);

// Validate channel
await youtubeService.validateChannel(channelId);
```

### Twitch Service
```typescript
// Check stream status
await twitchService.checkStreamStatus(username);

// Get user info
await twitchService.getUserInfo(username);

// Validate user
await twitchService.validateUser(username);
```

### Twitter Service
```typescript
// Check for new tweets
await twitterService.checkForNewTweets(username, lastTweetId);

// Get user info
await twitterService.getUserInfo(username);

// Validate user
await twitterService.validateUser(username);
```

### RSS Service
```typescript
// Check for new items
await rssService.checkForNewItems(feedUrl, lastItemId);

// Validate feed
await rssService.validateFeed(feedUrl);

// Get feed metadata
await rssService.getFeedMetadata(feedUrl);
```

## DTOs

### CreateFeedDto
```typescript
{
  platform: SocialPlatform;           // YOUTUBE | TWITCH | TWITTER | RSS
  accountId: string;                  // Platform-specific ID
  accountName: string;                // Display name
  accountUrl?: string;                // Profile URL
  channelId: string;                  // Discord channel ID
  roleToMention?: string;             // Discord role ID
  customMessage?: string;             // Custom notification message
  embedEnabled?: boolean;             // Enable embed (default: true)
  embedColor?: string;                // Hex color
  filterKeywords?: string;            // Comma-separated keywords to include
  excludeKeywords?: string;           // Comma-separated keywords to exclude
}
```

### UpdateFeedDto
All fields are optional:
```typescript
{
  accountName?: string;
  accountUrl?: string;
  channelId?: string;
  roleToMention?: string;
  customMessage?: string;
  embedEnabled?: boolean;
  embedColor?: string;
  filterKeywords?: string;
  excludeKeywords?: string;
  isActive?: boolean;
}
```

## Usage Example

### 1. Import the Module
```typescript
import { SocialFeedsModule } from './modules/social-feeds';

@Module({
  imports: [SocialFeedsModule],
})
export class AppModule {}
```

### 2. Create a Feed
```typescript
const feed = await socialFeedsService.createFeed(
  'guild-123',
  'bot-456',
  {
    platform: SocialPlatform.YOUTUBE,
    accountId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    accountName: 'Google Developers',
    accountUrl: 'https://youtube.com/c/GoogleDevelopers',
    channelId: 'channel-789',
    roleToMention: 'role-101',
    customMessage: 'New video from {accountName}!',
    embedEnabled: true,
    embedColor: '#FF0000',
  }
);
```

### 3. Set Up Cron Job
```typescript
@Cron('*/5 * * * *') // Every 5 minutes
async handleCron() {
  await this.socialFeedsService.processAllFeeds();
}
```

### 4. Get Statistics
```typescript
const stats = await socialFeedsService.getStatistics('guild-123');
console.log(stats);
// {
//   totalFeeds: 10,
//   activeFeeds: 8,
//   inactiveFeeds: 2,
//   feedsWithErrors: 1,
//   recentlyChecked: 7,
//   byPlatform: {
//     YOUTUBE: 4,
//     TWITCH: 3,
//     TWITTER: 2,
//     RSS: 1
//   }
// }
```

## Implementing Platform APIs

The platform services currently have placeholder implementations. To fully implement them:

### YouTube Integration
1. Get YouTube Data API v3 key from Google Cloud Console
2. Install `googleapis` package
3. Implement API calls in `youtube.service.ts`

### Twitch Integration
1. Register application on Twitch Developer Portal
2. Get Client ID and Client Secret
3. Install `@twurple/api` or use HTTP client
4. Implement OAuth flow and API calls in `twitch.service.ts`

### Twitter Integration
1. Get Twitter API credentials from Developer Portal
2. Install `twitter-api-v2` package
3. Implement API calls in `twitter.service.ts`

### RSS Integration
1. Install `rss-parser` package
2. Implement feed parsing in `rss.service.ts`

## Database Schema

The module uses these Prisma models:

### SocialFeedsConfig
```prisma
model SocialFeedsConfig {
  id        String   @id @default(uuid())
  guildId   String   @unique
  botId     String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  feeds     SocialFeed[]
}
```

### SocialFeed
```prisma
model SocialFeed {
  id              String          @id @default(uuid())
  configId        String
  guildId         String
  platform        SocialPlatform
  accountId       String
  accountName     String
  accountUrl      String?
  channelId       String
  roleToMention   String?
  customMessage   String?
  embedEnabled    Boolean         @default(true)
  embedColor      String?
  filterKeywords  String?
  excludeKeywords String?
  isActive        Boolean         @default(true)
  lastChecked     DateTime?
  lastPostId      String?
  lastPostUrl     String?
  errorCount      Int             @default(0)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  config          SocialFeedsConfig @relation(fields: [configId], references: [id])
}
```

### SocialPlatform Enum
```prisma
enum SocialPlatform {
  YOUTUBE
  TWITCH
  TWITTER
  INSTAGRAM
  TIKTOK
  REDDIT
  RSS
}
```

## Error Handling

The module includes automatic error tracking:
- Failed feed checks increment `errorCount`
- Successful checks reset `errorCount` to 0
- Feeds with high error counts can be identified via statistics
- All errors are logged with detailed context

## Future Enhancements

- [ ] Implement actual platform API integrations
- [ ] Add webhook-based notifications (when supported by platforms)
- [ ] Implement content caching to avoid duplicate notifications
- [ ] Add support for Instagram, TikTok, and Reddit
- [ ] Implement advanced filtering (regex, sentiment analysis)
- [ ] Add notification templates system
- [ ] Implement rate limiting and quota management
- [ ] Add feed health monitoring dashboard
