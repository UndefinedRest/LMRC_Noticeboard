/**
 * LMRC Noticeboard Setup Script
 * Interactive setup for first-time configuration
 */

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('═══════════════════════════════════════════════');
console.log('  LMRC NOTICEBOARD - SETUP WIZARD');
console.log('═══════════════════════════════════════════════\n');

async function setup() {
  try {
    const configPath = path.join(__dirname, '../config.json');

    console.log('Step 1: Checking configuration...\n');
    
    if (!existsSync(configPath)) {
      console.log('config.json not found. Creating default configuration.\n');
      
      const clubName = await question('Club Name (default: Lake Macquarie Rowing Club): ') || 'Lake Macquarie Rowing Club';
      const facebookHandle = await question('Facebook Handle (e.g., @LakeMacquarieRC): ') || '@LakeMacquarieRC';
      const instagramHandle = await question('Instagram Handle (e.g., @lmrc_rowing): ') || '@lmrc_rowing';
      
      const defaultConfig = {
        display: {
          layout: {
            leftPanelWidth: 35,
            centerPanelWidth: 30,
            rightPanelWidth: 35,
            headerHeight: 140,
            footerHeight: 160
          },
          typography: {
            baseFontSize: 30,
            fontScale: {
              xs: 0.75,
              sm: 0.85,
              base: 1.0,
              lg: 1.15,
              xl: 1.35,
              "2xl": 1.5,
              "3xl": 1.75,
              "4xl": 2.0,
              "5xl": 2.5,
              "6xl": 3.0,
              "7xl": 3.5,
              "8xl": 4.0,
              "9xl": 4.5
            }
          }
        },
        timing: {
          heroRotationSeconds: 15,
          newsPanelRotationSeconds: 45,
          sponsorRotationSeconds: 30,
          dataRefreshSeconds: 60,
          weatherRefreshMinutes: 30
        },
        branding: {
          clubName: clubName,
          clubLogoPath: "/assets/logo.png",
          clubColors: {
            primary: "#003366",
            secondary: "#0066CC",
            accent: "#FFD700",
            background: "#F5F5F5",
            text: "#333333"
          },
          tagline: "Rowing Excellence"
        },
        socialMedia: {
          facebook: {
            enabled: true,
            handle: facebookHandle,
            url: `https://facebook.com/${facebookHandle.replace('@', '')}`
          },
          instagram: {
            enabled: true,
            handle: instagramHandle,
            url: `https://instagram.com/${instagramHandle.replace('@', '')}`
          }
        },
        news: {
          itemRotationSeconds: 45,
          showFeaturedOnly: false,
          maxContentLength: 2000
        },
        weather: {
          location: "Morisset",
          latitude: -33.0333,
          longitude: 151.6,
          units: "metric"
        },
        scraper: {
          baseUrl: "https://www.lakemacquarierowingclub.org.au",
          paths: {
            gallery: "/gallery",
            events: "/events/list",
            news: "/news",
            sponsors: "/home"
          },
          scheduleEnabled: true,
          schedule: "0 */4 * * *",
          runOnStartup: true,
          startupDelaySeconds: 10,
          maxRetries: 3,
          timeoutSeconds: 30
        },
        advanced: {
          enableAnimations: true,
          transitionDuration: 500,
          logLevel: "info",
          enableKenBurnsEffect: true
        }
      };
      
      await fs.writeFile(configPath, JSON.stringify(defaultConfig, null, 2));
      console.log('\n✓ config.json created\n');
    } else {
      console.log('✓ config.json already exists\n');
    }
    
    // Create directories
    console.log('Step 2: Creating directories...\n');
    
    const dirs = [
      path.join(__dirname, '../data'),
      path.join(__dirname, '../public/assets'),
      path.join(__dirname, '../public/assets/sponsors'),
      path.join(__dirname, '../public/assets/fallback')
    ];
    
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ Created ${path.basename(dir)}/`);
    }
    
    console.log('\n');
    
    // Test scraper
    console.log('Step 3: Testing scraper...\n');
    const testScraper = await question('Run test scrape now? (y/n): ');

    if (testScraper.toLowerCase() === 'y') {
      console.log('\nRunning test scrape... (this may take a few seconds)\n');

      try {
        const { default: NoticeboardScraper } = await import('../scraper/noticeboard-scraper.js');
        const scraper = new NoticeboardScraper();
        await scraper.scrapeAll();
        console.log('\n✓ Test scrape completed successfully!\n');
      } catch (err) {
        console.error('\n✗ Test scrape failed:', err.message);
        console.log('\nPlease check your internet connection and RevSport website availability\n');
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('  SETUP COMPLETE!');
    console.log('═══════════════════════════════════════════════\n');
    
    console.log('Next steps:\n');
    console.log('1. Build the React app: npm run build');
    console.log('2. Start the server: npm start');
    console.log('3. Open browser: http://localhost:3000');
    console.log('4. Configure via Web UI: http://localhost:3000/config\n');

    console.log('Web Configuration Interface:');
    console.log('  - Set club colors, timing, and branding');
    console.log('  - Configure scraper schedule (default: every 4 hours)');
    console.log('  - Manage sponsors and social media settings');
    console.log('  - Trigger scraper runs manually\n');

    console.log('Assets:');
    console.log('  - Add your club logo to: public/assets/logo.png');
    console.log('  - Add sponsor logos to: public/assets/sponsors/\n');

    console.log('For deployment on Raspberry Pi, see DEPLOYMENT.md\n');
    
  } catch (err) {
    console.error('\nSetup failed:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup();
