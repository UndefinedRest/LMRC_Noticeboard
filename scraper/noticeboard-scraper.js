/**
 * LMRC Noticeboard Content Scraper - COMPLETE VERSION
 * Scrapes gallery, events, news, and sponsors from RevSport platform
 */

console.log('=== SCRAPER FILE LOADING ===');

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

console.log('=== IMPORTS LOADED ===');
console.log('Username:', process.env.REVSPORT_USERNAME ? 'Found' : 'MISSING');
console.log('Password:', process.env.REVSPORT_PASSWORD ? 'Found' : 'MISSING');

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

    await this.authenticate();
  }

  async authenticate() {
    console.log('🔐 Authenticating with RevSport...');

    try {
      await this.page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });

      const csrfToken = await this.page.$eval('input[name="_token"]', el => el.value);
      console.log('[Auth] CSRF token extracted');

      await this.page.type('#username', process.env.REVSPORT_USERNAME);
      await this.page.type('#password', process.env.REVSPORT_PASSWORD);

      await Promise.all([
        this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
        this.page.click('button[type="submit"]')
      ]);

      const isAuthenticated = await this.page.evaluate(() => {
        return document.body.textContent.includes('Log out') ||
               document.body.textContent.includes('Logout');
      });

      if (isAuthenticated) {
        console.log('✓ Authentication successful');
        this.authenticated = true;
      } else {
        throw new Error('Authentication failed');
      }

    } catch (err) {
      console.error('[Auth] ERROR:', err.message);
      throw err;
    }
  }

  async scrapeGallery() {
    console.log('\n[Gallery] Scraping gallery...');

    try {
      await this.page.goto(`${BASE_URL}/gallery`, { waitUntil: 'networkidle2' });
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
          .filter((album, index, self) => 
            index === self.findIndex(a => a.albumId === album.albumId)
          );
      });

      console.log(`[Gallery] Found ${albums.length} albums`);

      const albumsWithPhotos = [];
      
      for (let i = 0; i < Math.min(albums.length, 10); i++) {
        const album = albums[i];
        console.log(`[Gallery] Scraping album ${i + 1}/${Math.min(albums.length, 10)}: ${album.title}`);

        try {
          await this.page.goto(album.url, { waitUntil: 'networkidle2', timeout: 20000 });
          
          await new Promise(resolve => setTimeout(resolve, 3000));
          await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await new Promise(resolve => setTimeout(resolve, 2000));
          await this.page.evaluate(() => window.scrollTo(0, 0));
          await new Promise(resolve => setTimeout(resolve, 1000));

          const photos = await this.page.evaluate(() => {
            let images = [];
            
            const galleryLinks = document.querySelectorAll('a.cs-gallery-item, a[class*="gallery-item"]');
            
            galleryLinks.forEach(link => {
              const href = link.href;
              if (href && href.match(/\.(jpg|jpeg|png|gif|webp)/i)) {
                const span = link.querySelector('span[style*="background-image"]');
                let thumbUrl = href;
                
                if (span) {
                  const style = span.getAttribute('style');
                  const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                  if (match) thumbUrl = match[1];
                }
                
                images.push({
                  url: href,
                  thumbnail: thumbUrl,
                  alt: link.getAttribute('data-sub-html') || '',
                  source: 'cs-gallery-item'
                });
              }
            });
            
            if (images.length === 0) {
              const gallery = document.querySelector('.cs-gallery, [class*="cs-gallery"]');
              if (gallery) {
                const links = gallery.querySelectorAll('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"]');
                
                links.forEach(link => {
                  const span = link.querySelector('span[style*="background-image"]');
                  if (span) {
                    const style = span.getAttribute('style');
                    const match = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
                    if (match) {
                      images.push({
                        url: link.href,
                        thumbnail: match[1],
                        alt: '',
                        source: 'cs-gallery-fallback'
                      });
                    }
                  }
                });
              }
            }
            
            const seen = new Set();
            const unique = images.filter(img => {
              if (seen.has(img.url)) return false;
              seen.add(img.url);
              return true;
            });
            
            return unique.slice(0, 30);
          });
          
          if (photos.length > 0) {
            albumsWithPhotos.push({
              ...album,
              photos,
              photoCount: photos.length,
              scrapedAt: new Date().toISOString()
            });
            console.log(`  ✓ Found ${photos.length} photos`);
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
      await this.page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle2' });

      await this.page.waitForSelector('.fc-event, .event-item, [class*="event"]', { 
        timeout: 10000 
      }).catch(() => {
        console.log('[Events] No events found');
      });

      const events = await this.page.evaluate(() => {
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

            return { title, date: dateStr, url, type: 'event' };
          })
          .filter(Boolean)
          .slice(0, 10);
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

  async scrapeNews() {
    console.log('\n[News] Scraping news...');

    try {
      await this.page.goto(`${BASE_URL}/news`, { waitUntil: 'networkidle2' });
      await this.page.waitForSelector('a[href*="/news/"]', { timeout: 10000 });

      const newsLinks = await this.page.evaluate(() => {
        const articleCards = Array.from(document.querySelectorAll('[class*="card"], [class*="article"], [class*="post"]'));
        
        return articleCards
          .map(card => {
            const link = card.querySelector('a[href*="/news/"]');
            if (!link) return null;
            
            const title = link.textContent.trim() || 
                         card.querySelector('h1, h2, h3, h4, h5')?.textContent.trim() || '';
            const url = link.href;
            const articleId = url.split('/news/')[1]?.split('?')[0];
            
            const isFeatured = card.textContent.includes('Featured') ||
                              card.querySelector('[class*="featured"]') !== null;
            
            const dateEl = card.querySelector('[class*="date"], time, .text-muted');
            const date = dateEl?.textContent.trim() || dateEl?.getAttribute('datetime') || '';

            const excerptEl = card.querySelector('p, [class*="excerpt"], [class*="description"]');
            const excerpt = excerptEl?.textContent.trim() || '';

            if (!title || !articleId || title.length < 3) return null;

            return {
              title,
              url,
              articleId,
              date,
              excerpt,
              isFeatured,
              type: title.toLowerCase().includes('result') ? 'result' : 'news'
            };
          })
          .filter(Boolean)
          .filter((item, index, self) => 
            index === self.findIndex(n => n.articleId === item.articleId)
          );
      });

      console.log(`[News] Found ${newsLinks.length} articles`);

      const newsWithContent = [];
      
      for (let i = 0; i < Math.min(newsLinks.length, 20); i++) {
        const newsItem = newsLinks[i];
        console.log(`[News] Fetching ${i + 1}/${Math.min(newsLinks.length, 20)}: ${newsItem.title.substring(0, 40)}...`);
        
        try {
          await this.page.goto(newsItem.url, { waitUntil: 'networkidle2', timeout: 15000 });
          
          const fullContent = await this.page.evaluate(() => {
            const contentSelectors = [
              'article [class*="content"]',
              'article [class*="body"]',
              '[class*="article-content"]',
              'article p',
              '.content p',
              'main p'
            ];
            
            let bodyText = '';
            
            for (const selector of contentSelectors) {
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                bodyText = Array.from(elements)
                  .map(el => el.textContent.trim())
                  .filter(text => text.length > 20)
                  .join('\n\n');
                
                if (bodyText.length > 100) break;
              }
            }
            
            return bodyText || 'Content not available';
          });
          
          newsWithContent.push({
            ...newsItem,
            content: fullContent,
            contentLength: fullContent.length
          });
          
          console.log(`  ✓ ${fullContent.length} chars`);
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
      await this.page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle2' });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 2000));

      const sponsors = await this.page.evaluate(() => {
        let sponsorLogos = [];
        
        const carouselItems = document.querySelectorAll('.tns-item a[href*="/sponsor/"]');
        
        carouselItems.forEach(link => {
          const img = link.querySelector('img');
          if (img) {
            const src = img.src || img.getAttribute('data-src');
            const alt = img.alt || link.getAttribute('title') || '';
            
            if (src && src.includes('cdn.revolutionise.com/sponsors')) {
              sponsorLogos.push({
                name: alt || 'Sponsor',
                logoUrl: src,
                url: link.href,
                source: 'tns-carousel'
              });
            }
          }
        });
        
        if (sponsorLogos.length === 0) {
          const sponsorLinks = document.querySelectorAll('a[href*="/sponsor/"]');
          
          sponsorLinks.forEach(link => {
            const img = link.querySelector('img');
            if (img) {
              const src = img.src || img.getAttribute('data-src');
              const alt = img.alt || link.getAttribute('title') || '';
              
              if (src) {
                sponsorLogos.push({
                  name: alt || 'Sponsor',
                  logoUrl: src,
                  url: link.href,
                  source: 'sponsor-link'
                });
              }
            }
          });
        }
        
        const seen = new Set();
        return sponsorLogos.filter(s => {
          if (seen.has(s.logoUrl)) return false;
          seen.add(s.logoUrl);
          return true;
        });
      });

      console.log(`[Sponsors] Found ${sponsors.length} sponsors`);
      if (sponsors.length > 0) {
        console.log(`[Sponsors] Sample:`, sponsors.slice(0, 3).map(s => s.name));
      }

      return {
        sponsors,
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
    console.log('  LMRC NOTICEBOARD SCRAPER');
    console.log('═══════════════════════════════════════════════\n');

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

      console.log('\n═══════════════════════════════════════════════');
      console.log('  SCRAPING SUMMARY');
      console.log('═══════════════════════════════════════════════');
      console.log(`Gallery albums: ${galleryData.albums?.length || 0}`);
      console.log(`Total photos: ${galleryData.albums?.reduce((sum, a) => sum + a.photoCount, 0) || 0}`);
      console.log(`Events: ${eventsData.events?.length || 0}`);
      console.log(`News items: ${newsData.news?.length || 0}`);
      console.log(`Sponsors: ${sponsorsData.sponsors?.length || 0}`);
      console.log(`Completed: ${new Date().toLocaleString()}`);
      console.log('═══════════════════════════════════════════════\n');

      return {
        success: true,
        gallery: galleryData,
        events: eventsData,
        news: newsData,
        sponsors: sponsorsData
      };

    } catch (err) {
      console.error('\n❌ SCRAPING FAILED:', err.message);
      throw err;
    } finally {
      await this.cleanup();
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('[Cleanup] Browser closed');
    }
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