/**
 * LMRC Noticeboard Content Scraper - LIGHTWEIGHT VERSION
 * Scrapes gallery, events, news, and sponsors from RevSport platform
 * Uses cheerio for fast HTML parsing (no browser required)
 */

console.log('=== SCRAPER FILE LOADING ===');

import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('=== IMPORTS LOADED ===');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load configuration synchronously at startup
const CONFIG_PATH = path.join(__dirname, '../config.json');
let config = {};
try {
  const configData = fsSync.readFileSync(CONFIG_PATH, 'utf-8');
  config = JSON.parse(configData);
} catch (err) {
  console.error('Error loading config.json:', err.message);
  process.exit(1);
}

const BASE_URL = config.scraper?.baseUrl || 'https://www.lakemacquarierowingclub.org.au';
const PATHS = config.scraper?.paths || {
  gallery: '/gallery',
  events: '/events/list',
  news: '/news',
  sponsors: '/home'
};
const DATA_DIR = path.join(__dirname, '../data');
const MAX_RETRIES = config.scraper?.maxRetries || 3;
const TIMEOUT_MS = (config.scraper?.timeoutSeconds || 30) * 1000;

class NoticeboardScraper {
  constructor() {
    // No browser needed!
  }

  async init() {
    console.log('[NoticeboardScraper] Lightweight scraper initialized (no browser needed)');
  }

  /**
   * Fetch HTML from a URL with timeout
   */
  async fetchHTML(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.text();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async scrapeGallery() {
    console.log('\n[Gallery] Scraping gallery...');

    try {
      // Fetch gallery listing page
      const html = await this.fetchHTML(`${BASE_URL}${PATHS.gallery}`);
      const $ = cheerio.load(html);

      // Extract album links
      const albums = [];
      $('a[href*="/gallery/"]').each((i, elem) => {
        const $link = $(elem);
        const title = $link.text().trim();
        const url = $link.attr('href');

        if (!url) return;

        // Make URL absolute if needed
        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
        const albumId = url.split('/gallery/')[1]?.split('?')[0];

        // Filter out invalid entries
        if (!title || !albumId || title.length < 2) return;

        // Check if this is a duplicate
        if (albums.some(a => a.albumId === albumId)) return;

        albums.push({ title, url: fullUrl, albumId });
      });

      console.log(`[Gallery] Found ${albums.length} albums`);

      const albumsWithPhotos = [];

      // Scrape each album (limit to first 10 albums)
      for (let i = 0; i < Math.min(albums.length, 10); i++) {
        const album = albums[i];
        console.log(`[Gallery] Scraping album ${i + 1}/${Math.min(albums.length, 10)}: ${album.title}`);

        try {
          const albumHtml = await this.fetchHTML(album.url);
          const $album = cheerio.load(albumHtml);

          const photos = [];

          // Extract gallery items
          $album('a.cs-gallery-item, a[class*="gallery-item"]').each((j, elem) => {
            const $link = $album(elem);
            const href = $link.attr('href');

            // Check if this is an image
            if (href && href.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
              const $span = $link.find('span[style*="background-image"]');
              let thumbUrl = href;

              // Extract thumbnail from background-image style
              if ($span.length) {
                const style = $span.attr('style');
                const match = style?.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                if (match) thumbUrl = match[1];
              }

              photos.push({
                url: href,
                thumbnail: thumbUrl,
                alt: $link.attr('data-sub-html') || '',
                source: 'cs-gallery-item'
              });
            }
          });

          // Remove duplicates
          const uniquePhotos = [];
          const seen = new Set();
          photos.forEach(photo => {
            if (!seen.has(photo.url)) {
              seen.add(photo.url);
              uniquePhotos.push(photo);
            }
          });

          if (uniquePhotos.length > 0) {
            albumsWithPhotos.push({
              ...album,
              photos: uniquePhotos,
              photoCount: uniquePhotos.length,
              scrapedAt: new Date().toISOString()
            });
            console.log(`  ✓ Found ${uniquePhotos.length} photos`);
          } else {
            console.log(`  ⚠ No photos found`);
          }

        } catch (err) {
          console.error(`  ✗ Error: ${err.message}`);
        }
      }

      return {
        albums: albumsWithPhotos,
        totalAlbums: albums.length,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error('[Gallery] ERROR:', err.message);
      return { albums: [], totalAlbums: 0, error: err.message };
    }
  }

  async scrapeEvents() {
    console.log('\n[Events] Scraping events...');

    try {
      const html = await this.fetchHTML(`${BASE_URL}${PATHS.events}`);
      const $ = cheerio.load(html);

      const events = [];

      $('.card.card-hover').each((i, elem) => {
        const $card = $(elem);

        // Get the title link
        const $titleLink = $card.find('a[href*="/events/"]').first();
        if (!$titleLink.length) return;

        const title = $titleLink.text().trim();
        const url = $titleLink.attr('href');

        // Get all text content of the card
        const cardText = $card.text();

        // Extract date/time - format like "Sat 26 Oct 2025 08:00 — 17:00"
        const dateMatch = cardText.match(/([A-Z][a-z]{2}\s+\d{1,2}\s+[A-Z][a-z]{2,8}\s+\d{4}\s+\d{1,2}:\d{2}(?:\s*—\s*(?:[A-Z][a-z]{2}\s+)?\d{1,2}(?:\s+[A-Z][a-z]{2,8}\s+\d{4})?\s+\d{1,2}:\d{2})?)/);
        const dateText = dateMatch ? dateMatch[1] : '';

        // Extract location - appears after date
        const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let location = '';

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          // Skip title and date lines
          if (line === title || line.includes(dateText) || line === 'Details') continue;
          // This should be the location
          if (line.length > 0 && line.length < 100) {
            location = line;
            break;
          }
        }

        // Only add valid events (skip navigation items)
        if (title && title.length > 5 &&
            !title.includes('Download') &&
            !title.includes('Past') &&
            !title.includes('Calendar') &&
            url && url.match(/\/events\/\d+/)) {

          const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

          events.push({
            title,
            date: dateText,
            location,
            url: fullUrl,
            eventId: url.split('/events/')[1],
            type: 'event'
          });
        }
      });

      console.log(`[Events] Found ${events.length} events`);

      return {
        events,
        totalEvents: events.length,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error('[Events] ERROR:', err.message);
      return { events: [], totalEvents: 0, error: err.message, scrapedAt: new Date().toISOString() };
    }
  }

  async scrapeNews() {
    console.log('\n[News] Scraping news...');

    try {
      const html = await this.fetchHTML(`${BASE_URL}${PATHS.news}`);
      const $ = cheerio.load(html);

      const newsLinks = [];

      $('[class*="card"], [class*="article"], [class*="post"]').each((i, elem) => {
        const $card = $(elem);
        const $link = $card.find('a[href*="/news/"]').first();

        if (!$link.length) return;

        const title = $link.text().trim() ||
                     $card.find('h1, h2, h3, h4, h5').first().text().trim() || '';
        const url = $link.attr('href');
        const articleId = url?.split('/news/')[1]?.split('?')[0];

        const isFeatured = $card.text().includes('Featured') ||
                          $card.find('[class*="featured"]').length > 0;

        const $dateEl = $card.find('[class*="date"], time, .text-muted').first();
        const date = $dateEl.text().trim() || $dateEl.attr('datetime') || '';

        const $excerptEl = $card.find('p, [class*="excerpt"], [class*="description"]').first();
        const excerpt = $excerptEl.text().trim() || '';

        if (!title || !articleId || title.length < 3) return;

        // Check for duplicates
        if (newsLinks.some(n => n.articleId === articleId)) return;

        const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

        newsLinks.push({
          title,
          url: fullUrl,
          articleId,
          date,
          excerpt,
          isFeatured,
          type: title.toLowerCase().includes('result') ? 'result' : 'news'
        });
      });

      console.log(`[News] Found ${newsLinks.length} articles`);

      const newsWithContent = [];

      // Fetch full content for first 20 articles
      for (let i = 0; i < Math.min(newsLinks.length, 20); i++) {
        const newsItem = newsLinks[i];
        console.log(`[News] Fetching ${i + 1}/${Math.min(newsLinks.length, 20)}: ${newsItem.title.substring(0, 40)}...`);

        try {
          const articleHtml = await this.fetchHTML(newsItem.url);
          const $article = cheerio.load(articleHtml);

          // Try multiple selectors to find content
          // Extract ALL content types: paragraphs, tables, lists, etc.
          const contentSelectors = [
            'article [class*="content"]',
            'article [class*="body"]',
            '[class*="article-content"]',
            'article',
            '.content',
            'main'
          ];

          let bodyText = '';

          for (const selector of contentSelectors) {
            const $container = $article(selector).first();
            if ($container.length > 0) {
              // Extract ALL text content including tables, paragraphs, lists, etc.
              // Remove script and style tags
              $container.find('script, style, nav, header, footer, [class*="share"], [class*="social"]').remove();

              // Get all text content
              const texts = [];

              // Extract from paragraphs
              $container.find('p').each((j, elem) => {
                const text = $article(elem).text().trim();
                if (text.length > 0) texts.push(text);
              });

              // Extract from tables (important for race results!)
              $container.find('table').each((j, elem) => {
                const $table = $article(elem);
                const rows = [];
                $table.find('tr').each((i, row) => {
                  const $row = $article(row);
                  const cells = [];
                  $row.find('th, td').each((k, cell) => {
                    const cellText = $article(cell).text().trim();
                    if (cellText.length > 0) cells.push(cellText);
                  });
                  if (cells.length > 0) rows.push(cells.join(' - '));
                });
                if (rows.length > 0) texts.push(rows.join('\n'));
              });

              // Extract from lists
              $container.find('ul, ol').each((j, elem) => {
                const $list = $article(elem);
                const items = [];
                $list.find('li').each((i, li) => {
                  const itemText = $article(li).text().trim();
                  if (itemText.length > 0) items.push(itemText);
                });
                if (items.length > 0) texts.push(items.join('\n'));
              });

              // If we didn't find structured content, just get all text
              if (texts.length === 0) {
                bodyText = $container.text().trim();
              } else {
                bodyText = texts.join('\n\n');
              }

              // Stop if we found substantial content
              if (bodyText.length > 50) break;
            }
          }

          newsWithContent.push({
            ...newsItem,
            content: bodyText || 'Content not available',
            contentLength: bodyText.length
          });

          console.log(`  ✓ ${bodyText.length} chars`);

        } catch (err) {
          console.error(`  ✗ Error: ${err.message}`);
          newsWithContent.push({
            ...newsItem,
            content: newsItem.excerpt || 'Content not available',
            contentLength: newsItem.excerpt?.length || 0
          });
        }
      }

      console.log(`[News] Scraped ${newsWithContent.length} articles`);

      return {
        news: newsWithContent,
        totalArticles: newsLinks.length,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error('[News] ERROR:', err.message);
      return { news: [], totalArticles: 0, error: err.message };
    }
  }

  async scrapeSponsors() {
    console.log('\n[Sponsors] Scraping sponsors...');

    try {
      const html = await this.fetchHTML(`${BASE_URL}${PATHS.sponsors}`);
      const $ = cheerio.load(html);

      const sponsorLogos = [];
      const seen = new Set();

      // Strategy 1: Look for sponsor links
      $('a[href*="/sponsor/"]').each((i, elem) => {
        const $link = $(elem);
        const $img = $link.find('img').first();

        if ($img.length) {
          const src = $img.attr('src') ||
                     $img.attr('data-src') ||
                     $img.attr('data-lazy-src') ||
                     $img.attr('srcset')?.split(' ')[0];
          const alt = $img.attr('alt') || $link.attr('title') || '';

          if (src && src.length > 0 && !seen.has(src)) {
            seen.add(src);
            sponsorLogos.push({
              name: alt || 'Sponsor',
              logoUrl: src,
              url: $link.attr('href'),
              source: 'sponsor-link'
            });
          }
        }
      });

      // Strategy 2: Look for standalone sponsor images
      $('img[src*="sponsors"], img[alt*="Sponsor"]').each((i, elem) => {
        const $img = $(elem);

        // Skip if already captured by a link
        if ($img.closest('a[href*="/sponsor/"]').length) return;

        const src = $img.attr('src') ||
                   $img.attr('data-src') ||
                   $img.attr('data-lazy-src');
        const alt = $img.attr('alt') || '';

        if (src && !seen.has(src)) {
          seen.add(src);
          sponsorLogos.push({
            name: alt || 'Sponsor',
            logoUrl: src,
            url: '',
            source: 'standalone-image'
          });
        }
      });

      console.log(`[Sponsors] Found ${sponsorLogos.length} unique sponsors`);

      if (sponsorLogos.length > 0) {
        console.log(`[Sponsors] Sample:`, sponsorLogos.slice(0, 3).map(s => s.name));
      }

      return {
        sponsors: sponsorLogos,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error('[Sponsors] ERROR:', err.message);
      return { sponsors: [], error: err.message };
    }
  }

  async saveData(filename, data) {
    const filepath = path.join(DATA_DIR, filename);

    await fs.mkdir(DATA_DIR, { recursive: true });

    // Create backup of existing file
    try {
      const existingData = await fs.readFile(filepath, 'utf8');
      const backupPath = `${filepath}.backup`;
      await fs.writeFile(backupPath, existingData);
    } catch (err) {
      // No existing file
    }

    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`[Save] ✓ Saved ${filename}`);
  }

  async scrapeAll() {
    console.log('═══════════════════════════════════════════════');
    console.log('  LMRC NOTICEBOARD SCRAPER (Lightweight)');
    console.log('═══════════════════════════════════════════════\n');

    const startTime = Date.now();

    try {
      await this.init();

      const galleryData = await this.scrapeGallery();
      const eventsData = await this.scrapeEvents();
      const newsData = await this.scrapeNews();
      const sponsorsData = await this.scrapeSponsors();

      await this.saveData('gallery-data.json', galleryData);
      await this.saveData('events-data.json', eventsData);
      await this.saveData('news-data.json', newsData);
      await this.saveData('sponsors-data.json', sponsorsData);

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n═══════════════════════════════════════════════');
      console.log('  SCRAPING SUMMARY');
      console.log('═══════════════════════════════════════════════');
      console.log(`Gallery albums: ${galleryData.albums?.length || 0}`);
      console.log(`Total photos: ${galleryData.albums?.reduce((sum, a) => sum + a.photoCount, 0) || 0}`);
      console.log(`Events: ${eventsData.events?.length || 0}`);
      console.log(`News items: ${newsData.news?.length || 0}`);
      console.log(`Sponsors: ${sponsorsData.sponsors?.length || 0}`);
      console.log(`Duration: ${duration}s`);
      console.log(`Completed: ${new Date().toLocaleString()}`);
      console.log('═══════════════════════════════════════════════\n');

      return {
        success: true,
        duration,
        gallery: galleryData,
        events: eventsData,
        news: newsData,
        sponsors: sponsorsData
      };

    } catch (err) {
      console.error('\n❌ SCRAPING FAILED:', err.message);
      throw err;
    }
  }

  async cleanup() {
    // No browser to clean up!
    console.log('[Cleanup] No cleanup needed (no browser)');
  }
}

async function runWithRetry(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`\nAttempt ${attempt}/${retries}`);
      const scraper = new NoticeboardScraper();
      const result = await scraper.scrapeAll();

      console.log('✓ Scraping completed successfully!\n');
      return result;

    } catch (err) {
      console.error(`Attempt ${attempt} failed:`, err.message);

      if (attempt === retries) {
        console.error('❌ All retry attempts exhausted');
        process.exit(1);
      }

      console.log(`Waiting 10 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

const isMainModule = process.argv[1] && (
  import.meta.url.includes(process.argv[1].replace(/\\/g, '/')) ||
  import.meta.url.endsWith(path.basename(process.argv[1]))
);

if (isMainModule) {
  console.log('=== EXECUTING SCRAPER ===');
  runWithRetry().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export default NoticeboardScraper;
