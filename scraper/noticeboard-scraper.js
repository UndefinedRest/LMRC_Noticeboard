/**
 * LMRC Noticeboard Content Scraper
 * Scrapes gallery, events, and news from RevSport platform
 * Extends existing RevSportAuth authentication
 */

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://www.lakemacquarierowingclub.org.au';
const DATA_DIR = path.join(__dirname, '../data');
const MAX_RETRIES = 3;
const PAGE_TIMEOUT = 30000;

class NoticeboardScraper {
  constructor() {
    this.browser = null;
    this.page = null;
    this.authenticated = false;
  }

  /**
   * Initialize browser and authenticate
   */
  async init() {
    console.log('[NoticeboardScraper] Initializing...');
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1920, height: 1080 });
    await this.page.setDefaultTimeout(PAGE_TIMEOUT);

    // Authenticate
    await this.authenticate();
  }

  /**
   * Authenticate with RevSport (using existing auth pattern)
   */
  async authenticate() {
    console.log('🔐 Authenticating with RevSport...');

    try {
      // Navigate to login page
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

      // Extract CSRF token
      const csrfToken = await this.page.$eval(
        'input[name="_token"]',
        el => el.value
      );

      console.log('[Auth] CSRF token extracted');

      // Fill login form
      await this.page.type('#username', process.env.REVSPORT_USERNAME);
      await this.page.type('#password', process.env.REVSPORT_PASSWORD);

      // Submit form
      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('button[type="submit"]')
      ]);

      // Verify authentication
      const isAuthenticated = await this.page.evaluate(() => {
        return document.body.textContent.includes('Log out') ||
               document.body.textContent.includes('Logout');
      });

      if (isAuthenticated) {
        console.log('✓ Authentication successful');
        this.authenticated = true;
      } else {
        throw new Error('Authentication failed - no logout button found');
      }

    } catch (err) {
      console.error('[Auth] ERROR:', err.message);
      throw err;
    }
  }

  /**
   * Scrape gallery albums and photos
   */
  async scrapeGallery() {
    console.log('\n[Gallery] Scraping gallery...');

    try {
      await this.page.goto(`${BASE_URL}/gallery`, { waitUntil: 'networkidle2' });

      // Wait for gallery to load
      await this.page.waitForSelector('a[href*="/gallery/"]', { timeout: 10000 });

      const albums = await this.page.evaluate(() => {
        const albumLinks = Array.from(document.querySelectorAll('a[href*="/gallery/"]'));
        
        return albumLinks
          .map(link => {
            const title = link.textContent.trim();
            const url = link.href;
            const albumId = url.split('/gallery/')[1]?.split('?')[0];
            
            if (!title || !albumId || title.length < 2) return null;
            
            return { title, url, albumId };
          })
          .filter(Boolean)
          // Remove duplicates
          .filter((album, index, self) => 
            index === self.findIndex(a => a.albumId === album.albumId)
          );
      });

      console.log(`[Gallery] Found ${albums.length} albums`);

      // Scrape photos from each album
      const albumsWithPhotos = [];
      
      for (let i = 0; i < Math.min(albums.length, 10); i++) {
        const album = albums[i];
        console.log(`[Gallery] Scraping album ${i + 1}/${Math.min(albums.length, 10)}: ${album.title}`);

        try {
          await this.page.goto(album.url, { waitUntil: 'networkidle2', timeout: 20000 });
          
          // Wait for images to load
          await this.page.waitForSelector('img', { timeout: 5000 });

          const photos = await this.page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            
            return images
              .map(img => ({
                url: img.src,
                alt: img.alt || '',
                thumbnail: img.src
              }))
              .filter(photo => 
                photo.url.includes('gallery') || 
                photo.url.includes('photo') ||
                photo.url.includes('image')
              )
              .slice(0, 20); // Max 20 photos per album
          });

          if (photos.length > 0) {
            albumsWithPhotos.push({
              ...album,
              photos,
              photoCount: photos.length,
              scrapedAt: new Date().toISOString()
            });
            console.log(`  ✓ Found ${photos.length} photos`);
          }

        } catch (err) {
          console.error(`  ✗ Error scraping album: ${err.message}`);
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

  /**
   * Scrape upcoming events
   */
  async scrapeEvents() {
    console.log('\n[Events] Scraping events...');

    try {
      await this.page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle2' });

      // Wait for calendar or event list
      await this.page.waitForSelector('.fc-event, .event-item, [class*="event"]', { 
        timeout: 10000 
      }).catch(() => {
        console.log('[Events] No events found or calendar not loaded');
      });

      const events = await this.page.evaluate(() => {
        // Try multiple selectors for events
        const eventElements = Array.from(document.querySelectorAll(
          '.fc-event, .event-item, [class*="calendar"] [class*="event"]'
        ));

        return eventElements
          .map(el => {
            const title = el.textContent?.trim() || el.getAttribute('title') || '';
            const dateStr = el.getAttribute('data-date') || 
                           el.querySelector('[class*="date"]')?.textContent || '';
            const url = el.href || el.querySelector('a')?.href || '';

            if (!title || title.length < 3) return null;

            return {
              title,
              date: dateStr,
              url,
              type: 'event'
            };
          })
          .filter(Boolean)
          .slice(0, 10); // Next 10 events
      });

      console.log(`[Events] Found ${events.length} events`);

      return {
        events,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error('[Events] ERROR:', err.message);
      return { events: [], error: err.message };
    }
  }

  /**
   * Scrape news and results
   */
  async scrapeNews() {
    console.log('\n[News] Scraping news...');

    try {
      await this.page.goto(`${BASE_URL}/news`, { waitUntil: 'networkidle2' });

      // Wait for news articles
      await this.page.waitForSelector('a[href*="/news/"]', { timeout: 10000 });

      const newsItems = await this.page.evaluate(() => {
        const articleLinks = Array.from(document.querySelectorAll('a[href*="/news/"]'));
        
        return articleLinks
          .map(link => {
            const title = link.textContent.trim() || 
                         link.querySelector('h1, h2, h3, h4')?.textContent.trim() || '';
            const url = link.href;
            const articleId = url.split('/news/')[1]?.split('?')[0];
            
            // Try to find date nearby
            const dateEl = link.closest('[class*="article"], [class*="post"], [class*="item"]')
                              ?.querySelector('[class*="date"], time');
            const date = dateEl?.textContent.trim() || dateEl?.getAttribute('datetime') || '';

            // Try to find snippet
            const snippetEl = link.closest('[class*="article"], [class*="post"], [class*="item"]')
                                 ?.querySelector('p, [class*="excerpt"]');
            const snippet = snippetEl?.textContent.trim().slice(0, 150) || '';

            if (!title || !articleId || title.length < 3) return null;

            return {
              title,
              url,
              articleId,
              date,
              snippet,
              type: title.toLowerCase().includes('result') ? 'result' : 'news'
            };
          })
          .filter(Boolean)
          // Remove duplicates
          .filter((item, index, self) => 
            index === self.findIndex(n => n.articleId === item.articleId)
          )
          .slice(0, 20); // Latest 20 items
      });

      console.log(`[News] Found ${newsItems.length} news items`);

      return {
        news: newsItems,
        scrapedAt: new Date().toISOString()
      };

    } catch (err) {
      console.error('[News] ERROR:', err.message);
      return { news: [], error: err.message };
    }
  }

  /**
   * Save data to JSON file with backup
   */
  async saveData(filename, data) {
    const filepath = path.join(DATA_DIR, filename);
    
    // Ensure data directory exists
    await fs.mkdir(DATA_DIR, { recursive: true });

    // Backup existing file
    try {
      const existingData = await fs.readFile(filepath, 'utf8');
      const backupPath = `${filepath}.backup`;
      await fs.writeFile(backupPath, existingData);
      console.log(`[Save] Backed up ${filename}`);
    } catch (err) {
      // No existing file, that's OK
    }

    // Write new data
    await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`[Save] ✓ Saved ${filename}`);
  }

  /**
   * Run complete scraping cycle
   */
  async scrapeAll() {
    console.log('═══════════════════════════════════════════════');
    console.log('  LMRC NOTICEBOARD SCRAPER');
    console.log('═══════════════════════════════════════════════\n');

    try {
      await this.init();

      // Scrape all content
      const galleryData = await this.scrapeGallery();
      const eventsData = await this.scrapeEvents();
      const newsData = await this.scrapeNews();

      // Save all data
      await this.saveData('gallery-data.json', galleryData);
      await this.saveData('events-data.json', eventsData);
      await this.saveData('news-data.json', newsData);

      console.log('\n═══════════════════════════════════════════════');
      console.log('  SCRAPING SUMMARY');
      console.log('═══════════════════════════════════════════════');
      console.log(`Gallery albums: ${galleryData.albums?.length || 0}`);
      console.log(`Total photos: ${galleryData.albums?.reduce((sum, a) => sum + a.photoCount, 0) || 0}`);
      console.log(`Events: ${eventsData.events?.length || 0}`);
      console.log(`News items: ${newsData.news?.length || 0}`);
      console.log(`Completed: ${new Date().toLocaleString()}`);
      console.log('═══════════════════════════════════════════════\n');

      return {
        success: true,
        gallery: galleryData,
        events: eventsData,
        news: newsData
      };

    } catch (err) {
      console.error('\n❌ SCRAPING FAILED:', err.message);
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('[Cleanup] Browser closed');
    }
  }
}

// Run scraper with retry logic
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

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runWithRetry().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export default NoticeboardScraper;