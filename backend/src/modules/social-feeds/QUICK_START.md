# Social Feeds Module - Quick Start Guide

## Installation Complete!

The Social Feeds module has been successfully created at:
`/home/user/fivebot_v2/backend/src/modules/social-feeds/`

## Files Created (14 TypeScript files, 1238 total lines)

### Core Module Files
- ✅ `social-feeds.module.ts` (24 lines) - NestJS module definition
- ✅ `social-feeds.service.ts` (536 lines) - Main business logic with all methods
- ✅ `social-feeds.controller.ts` (173 lines) - REST API endpoints
- ✅ `index.ts` (5 lines) - Module exports

### Data Transfer Objects (DTOs)
- ✅ `dto/create-feed.dto.ts` (63 lines) - Feed creation validation
- ✅ `dto/update-feed.dto.ts` (60 lines) - Feed update validation
- ✅ `dto/update-config.dto.ts` (9 lines) - Config update validation
- ✅ `dto/toggle-feed.dto.ts` (8 lines) - Toggle validation
- ✅ `dto/index.ts` (4 lines) - DTO exports

### Platform Services
- ✅ `platforms/youtube.service.ts` (86 lines) - YouTube integration
- ✅ `platforms/twitch.service.ts` (86 lines) - Twitch integration
- ✅ `platforms/twitter.service.ts` (90 lines) - Twitter/X integration
- ✅ `platforms/rss.service.ts` (90 lines) - RSS feed integration
- ✅ `platforms/index.ts` (4 lines) - Platform exports

### Documentation
- ✅ `README.md` (369 lines) - Comprehensive documentation
- ✅ `QUICK_START.md` - This file

## Quick Integration

### 1. Import Module in App Module

```typescript
// src/app.module.ts
import { SocialFeedsModule } from './modules/social-feeds';

@Module({
  imports: [
    // ... other modules
    SocialFeedsModule,
  ],
})
export class AppModule {}
```

### 2. Use in Your Code

```typescript
import { SocialFeedsService } from './modules/social-feeds';

@Injectable()
export class MyService {
  constructor(
    private readonly socialFeedsService: SocialFeedsService,
  ) {}

  async createYouTubeFeed() {
    return await this.socialFeedsService.createFeed(
      'guild-id',
      'bot-id',
      {
        platform: SocialPlatform.YOUTUBE,
        accountId: 'channel-id',
        accountName: 'Channel Name',
        channelId: 'discord-channel-id',
      }
    );
  }
}
```

### 3. Available API Endpoints

All endpoints are prefixed with `/bots/:botId/social-feeds`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/config?guildId=xxx` | Get configuration |
| PUT | `/config?guildId=xxx` | Update configuration |
| GET | `/?guildId=xxx` | List all feeds |
| POST | `/?guildId=xxx` | Create new feed |
| GET | `/:feedId` | Get specific feed |
| PUT | `/:feedId` | Update feed |
| DELETE | `/:feedId` | Delete feed |
| POST | `/:feedId/test` | Test notification |
| POST | `/:feedId/check` | Check for new content |
| POST | `/:feedId/toggle` | Toggle active status |
| GET | `/statistics?guildId=xxx` | Get statistics |

## Service Methods

### Configuration
```typescript
getConfig(guildId: string)
updateConfig(guildId: string, botId: string, enabled: boolean)
```

### Feed Management
```typescript
getFeeds(guildId: string)
getFeed(feedId: string)
createFeed(guildId: string, botId: string, data: CreateFeedDto)
updateFeed(feedId: string, data: UpdateFeedDto)
deleteFeed(feedId: string)
toggleFeed(feedId: string, isActive: boolean)
```

### Feed Operations
```typescript
testFeed(feedId: string)
checkFeed(feedId: string)
processAllFeeds()  // For cron jobs
getStatistics(guildId: string)
```

## Supported Platforms

- ✅ **YouTube** - Video notifications
- ✅ **Twitch** - Stream status monitoring
- ✅ **Twitter/X** - Tweet notifications
- ✅ **RSS** - Generic RSS feed support
- 🚧 Instagram (schema ready, implementation pending)
- 🚧 TikTok (schema ready, implementation pending)
- 🚧 Reddit (schema ready, implementation pending)

## Next Steps

### 1. Implement Platform APIs

Each platform service has placeholder implementations. You need to:

**YouTube:**
```bash
npm install googleapis
```
Then implement API calls in `platforms/youtube.service.ts`

**Twitch:**
```bash
npm install @twurple/api @twurple/auth
```
Then implement API calls in `platforms/twitch.service.ts`

**Twitter:**
```bash
npm install twitter-api-v2
```
Then implement API calls in `platforms/twitter.service.ts`

**RSS:**
```bash
npm install rss-parser
```
Then implement feed parsing in `platforms/rss.service.ts`

### 2. Set Up Cron Job

Add a scheduled task to check feeds periodically:

```typescript
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class FeedCheckerService {
  constructor(
    private readonly socialFeedsService: SocialFeedsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAllFeeds() {
    const results = await this.socialFeedsService.processAllFeeds();
    console.log(`Processed ${results.totalProcessed} feeds`);
  }
}
```

### 3. Environment Variables

Add these to your `.env` file:

```env
# YouTube
YOUTUBE_API_KEY=your_youtube_api_key

# Twitch
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# Twitter/X
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
```

## Example Usage

### Create a YouTube Feed
```bash
curl -X POST http://localhost:3000/bots/bot-123/social-feeds?guildId=guild-456 \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "YOUTUBE",
    "accountId": "UCxxxxxx",
    "accountName": "Channel Name",
    "channelId": "discord-channel-id",
    "embedEnabled": true,
    "embedColor": "#FF0000"
  }'
```

### Check a Feed Manually
```bash
curl -X POST http://localhost:3000/bots/bot-123/social-feeds/feed-id/check
```

### Get Statistics
```bash
curl http://localhost:3000/bots/bot-123/social-feeds/statistics?guildId=guild-456
```

## Testing

The module is ready for integration testing. Run:

```bash
# Unit tests (when you add them)
npm run test

# E2E tests (when you add them)
npm run test:e2e
```

## Database

The module uses these Prisma models (already in your schema):
- `SocialFeedsConfig` - Guild configuration
- `SocialFeed` - Individual feed entries
- `SocialPlatform` (enum) - Platform types

No migration needed - tables already exist!

## Support

For detailed documentation, see `README.md` in this directory.

For issues or questions, check the main project documentation.

---

**Status:** ✅ Module structure complete and ready for API implementation
**Next:** Implement platform-specific API integrations
