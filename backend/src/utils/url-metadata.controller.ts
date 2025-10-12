import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as cheerio from 'cheerio';

@Controller('url-metadata')
@UseGuards(AuthGuard('jwt'))
export class UrlMetadataController {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 3600000; // 1 hour

  @Get()
  async getMetadata(@Query('url') url: string) {
    if (!url) {
      return { error: 'URL parameter is required' };
    }

    // Check cache first
    const cached = this.cache.get(url);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      // Fetch the URL
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; FiveBotMetaFetcher/1.0)',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract OpenGraph metadata
      const metadata = {
        title:
          $('meta[property="og:title"]').attr('content') ||
          $('meta[name="twitter:title"]').attr('content') ||
          $('title').text() ||
          'No title',
        description:
          $('meta[property="og:description"]').attr('content') ||
          $('meta[name="twitter:description"]').attr('content') ||
          $('meta[name="description"]').attr('content') ||
          '',
        image:
          $('meta[property="og:image"]').attr('content') ||
          $('meta[name="twitter:image"]').attr('content') ||
          '',
        url:
          $('meta[property="og:url"]').attr('content') || url,
        siteName:
          $('meta[property="og:site_name"]').attr('content') || '',
      };

      // Cache the result
      this.cache.set(url, { data: metadata, timestamp: Date.now() });

      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for ${url}:`, error.message);
      return {
        title: new URL(url).hostname,
        description: '',
        image: '',
        url: url,
        siteName: '',
        error: error.message,
      };
    }
  }
}
