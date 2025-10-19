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
    // Check if .env exists
    const envPath = path.join(__dirname, '../.env');
    const configPath = path.join(__dirname, '../config.json');
    
    console.log('Step 1: Checking environment files...\n');
    
    // Setup .env
    if (!existsSync(envPath)) {
      console.log('.env file not found. Let\'s create it.\n');
      
      const username = await question('RevSport Username: ');
      const password = await question('RevSport Password: ');
      const port = await question('Server Port (default 3000): ') || '3000';
      
      const envContent = `# RevSport Authentication
REVSPORT_USERNAME=${username}
REVSPORT_PASSWORD=${password}

# Server Configuration
PORT=${port}
NODE_ENV=production

# Optional: Logging
LOG_LEVEL=info
`;
      
      await fs.writeFile(envPath, envContent);
      console.log('\n✓ .env file created\n');
    } else {
      console.log('✓ .env file already exists\n');
    }
    
    // Setup config.json
    console.log('Step 2: Checking configuration...\n');
    
    if (!existsSync(configPath)) {
      console.log('config.json not found. Creating default configuration.\n');
      
      const clubName = await question('Club Name (default: Lake Macquarie Rowing Club): ') || 'Lake Macquarie Rowing Club';
      const facebookHandle = await question('Facebook Handle (e.g., @LakeMacquarieRC): ') || '@LakeMacquarieRC';
      const instagramHandle = await question('Instagram Handle (e.g., @lmrc_rowing): ') || '@lmrc_rowing';
      
      const defaultConfig = {
        display: {
          name: "LMRC Noticeboard",
          resolution: { width: 1920, height: 1080 },
          layout: {
            leftPanelWidth: 25,
            centerPanelWidth: 50,
            rightPanelWidth: 25
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
        sponsors: [],
        gallery: {
          maxAlbumsToDisplay: 10,
          publicOnly: true,
          maxPhotosPerAlbum: 20,
          prioritizeRecent: true
        },
        events: {
          maxEventsToDisplay: 7,
          showPastEvents: false,
          daysAhead: 90
        },
        news: {
          maxItemsToDisplay: 7,
          itemsPerBatch: 7,
          showResults: true,
          showAnnouncements: true
        },
        weather: {
          location: "Morisset",
          bomStationId: "061055",
          showForecast: false
        },
        fallback: {
          enabled: true,
          clubLogoPath: "/assets/logo.png",
          genericImages: [],
          message: "Check our website for the latest updates"
        },
        scraper: {
          scheduleHourly: true,
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
    console.log('Step 3: Creating directories...\n');
    
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
    console.log('Step 4: Testing scraper...\n');
    const testScraper = await question('Run test scrape now? (y/n): ');
    
    if (testScraper.toLowerCase() === 'y') {
      console.log('\nRunning test scrape... (this may take a few minutes)\n');
      
      try {
        const { default: NoticeboardScraper } = await import('../scraper/noticeboard-scraper.js');
        const scraper = new NoticeboardScraper();
        await scraper.scrapeAll();
        console.log('\n✓ Test scrape completed successfully!\n');
      } catch (err) {
        console.error('\n✗ Test scrape failed:', err.message);
        console.log('\nPlease check your RevSport credentials in .env\n');
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('  SETUP COMPLETE!');
    console.log('═══════════════════════════════════════════════\n');
    
    console.log('Next steps:\n');
    console.log('1. Add your club logo to: public/assets/logo.png');
    console.log('2. Add sponsor logos to: public/assets/sponsors/');
    console.log('3. Update config.json with your club colors and details');
    console.log('4. Build the React app: npm run build');
    console.log('5. Start the server: npm start');
    console.log('6. Open browser: http://localhost:3000\n');
    
    console.log('For deployment on Raspberry Pi, see DEPLOYMENT.md\n');
    
  } catch (err) {
    console.error('\nSetup failed:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup();
