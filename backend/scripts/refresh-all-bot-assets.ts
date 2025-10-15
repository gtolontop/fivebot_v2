import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

interface DiscordUser {
  id: string;
  username: string;
  avatar?: string;
  banner?: string;
  bot?: boolean;
}

interface DiscordApplication {
  id: string;
  name: string;
  icon?: string;
}

async function validateBotToken(token: string): Promise<{
  user?: DiscordUser;
  application?: DiscordApplication;
}> {
  try {
    // Get user info
    const userResponse = await axios.get<DiscordUser>(
      'https://discord.com/api/v10/users/@me',
      {
        headers: { Authorization: `Bot ${token}` },
        timeout: 10000,
      }
    );

    const user = userResponse.data;

    // Get full user data with banner
    try {
      const fullUserResponse = await axios.get<DiscordUser>(
        `https://discord.com/api/v10/users/${user.id}`,
        {
          headers: { Authorization: `Bot ${token}` },
          timeout: 10000,
        }
      );
      user.banner = fullUserResponse.data.banner;
    } catch (e) {
      console.log('Could not fetch banner for user', user.id);
    }

    // Get application info
    const appResponse = await axios.get<DiscordApplication>(
      'https://discord.com/api/v10/applications/@me',
      {
        headers: { Authorization: `Bot ${token}` },
        timeout: 10000,
      }
    );

    return {
      user,
      application: appResponse.data,
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return {};
  }
}

function decryptToken(encryptedToken: string): string {
  // Simple base64 decode - adjust if you use different encryption
  try {
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  } catch (e) {
    console.error('Failed to decrypt token');
    return '';
  }
}

async function refreshAllBotAssets() {
  console.log('🚀 Starting bot assets refresh...\n');

  const bots = await prisma.bot.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      tokenEncrypted: true,
      avatar: true,
      banner: true,
    },
  });

  console.log(`Found ${bots.length} active bots\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const bot of bots) {
    try {
      console.log(`Processing bot: ${bot.name} (${bot.id})`);

      // Decrypt token (you'll need to adjust this based on your encryption method)
      // For now, assuming tokenEncrypted is the actual token
      const token = bot.tokenEncrypted;

      // Validate and get Discord data
      const { user, application } = await validateBotToken(token);

      if (!user || !application) {
        console.log(`❌ Failed to fetch Discord data for ${bot.name}\n`);
        errorCount++;
        continue;
      }

      // Build avatar URL
      let avatarUrl = null;
      if (user.avatar) {
        avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
      } else if (application.icon) {
        avatarUrl = `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.png?size=256`;
      }

      // Build banner URL
      const bannerUrl = user.banner
        ? `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.png?size=512`
        : null;

      // Update bot
      await prisma.bot.update({
        where: { id: bot.id },
        data: {
          avatar: avatarUrl,
          banner: bannerUrl,
        },
      });

      console.log(`✅ Updated ${bot.name}`);
      console.log(`   Avatar: ${avatarUrl ? 'Yes' : 'No'}`);
      console.log(`   Banner: ${bannerUrl ? 'Yes' : 'No'}\n`);

      successCount++;

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`❌ Error processing ${bot.name}:`, error);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📦 Total: ${bots.length}`);
}

// Run the script
refreshAllBotAssets()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
