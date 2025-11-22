/**
 * LMRC Noticeboard API Server
 * Serves React app and JSON data endpoints
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import dotenv from 'dotenv';
import ScraperScheduler from './server-scheduler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_PATH = path.join(__dirname, 'config.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

/**
 * Helper to read JSON file with error handling
 */
async function readJSONFile(filepath) {
  try {
    if (!existsSync(filepath)) {
      console.warn(`[API] File not found: ${filepath}`);
      return null;
    }

    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`[API] Error reading ${filepath}:`, err.message);
    return null;
  }
}

/**
 * Helper to check file age
 */
async function getFileAge(filepath) {
  try {
    const stats = await fs.stat(filepath);
    const ageMinutes = (Date.now() - stats.mtime.getTime()) / 1000 / 60;
    return ageMinutes;
  } catch {
    return Infinity;
  }
}

// ============================================================
// API ENDPOINTS
// ============================================================

/**
 * GET /api/gallery
 * Returns gallery albums and photos
 */
app.get('/api/gallery', async (req, res) => {
  const filepath = path.join(DATA_DIR, 'gallery-data.json');
  const data = await readJSONFile(filepath);
  
  if (!data) {
    return res.status(404).json({
      error: 'Gallery data not available',
      albums: [],
      message: 'Waiting for first scrape...'
    });
  }

  const ageMinutes = await getFileAge(filepath);
  
  res.json({
    ...data,
    dataAge: {
      minutes: Math.round(ageMinutes),
      stale: ageMinutes > 120 // Consider stale if > 2 hours
    }
  });
});

/**
 * GET /api/events
 * Returns upcoming events
 */
app.get('/api/events', async (req, res) => {
  const filepath = path.join(DATA_DIR, 'events-data.json');
  const data = await readJSONFile(filepath);
  
  if (!data) {
    return res.status(404).json({
      error: 'Events data not available',
      events: [],
      message: 'Waiting for first scrape...'
    });
  }

  const ageMinutes = await getFileAge(filepath);
  
  res.json({
    ...data,
    dataAge: {
      minutes: Math.round(ageMinutes),
      stale: ageMinutes > 120
    }
  });
});

/**
 * GET /api/news
 * Returns news articles and results
 */
app.get('/api/news', async (req, res) => {
  const filepath = path.join(DATA_DIR, 'news-data.json');
  const data = await readJSONFile(filepath);
  
  if (!data) {
    return res.status(404).json({
      error: 'News data not available',
      news: [],
      message: 'Waiting for first scrape...'
    });
  }

  const ageMinutes = await getFileAge(filepath);
  
  res.json({
    ...data,
    dataAge: {
      minutes: Math.round(ageMinutes),
      stale: ageMinutes > 120
    }
  });
});

/**
 * GET /api/sponsors
 * Returns sponsor logos and information
 */
app.get('/api/sponsors', async (req, res) => {
  const filepath = path.join(DATA_DIR, 'sponsors-data.json');
  const data = await readJSONFile(filepath);
  
  if (!data) {
    return res.status(404).json({
      error: 'Sponsors data not available',
      sponsors: [],
      message: 'Waiting for first scrape...'
    });
  }

  const ageMinutes = await getFileAge(filepath);
  
  res.json({
    ...data,
    dataAge: {
      minutes: Math.round(ageMinutes),
      stale: ageMinutes > 120
    }
  });
});

/**
 * GET /api/weather
 * Fetches current weather from OpenWeatherMap API
 */
app.get('/api/weather', async (req, res) => {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: 'Weather API not configured',
      message: 'OpenWeatherMap API key not found in environment variables. Add OPENWEATHERMAP_API_KEY to .env file.'
    });
  }

  const config = await readJSONFile(CONFIG_PATH);
  if (!config || !config.weather) {
    return res.status(500).json({
      error: 'Weather configuration missing',
      message: 'Weather settings not found in config.json'
    });
  }

  const { latitude, longitude, location, units = 'metric' } = config.weather;

  if (!latitude || !longitude) {
    return res.status(500).json({
      error: 'Weather location not configured',
      message: 'latitude and longitude must be set in config.json weather section'
    });
  }

  try {
    // Fetch current weather from OpenWeatherMap
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=${units}&appid=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[Weather] OpenWeatherMap API error: ${response.status} ${response.statusText}`);
      return res.status(response.status).json({
        error: 'Weather API request failed',
        message: `OpenWeatherMap returned ${response.status}`
      });
    }

    const data = await response.json();

    // Transform OpenWeatherMap response to our format
    const weatherData = {
      location: location || data.name,
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round(data.wind.speed * 3.6), // Convert m/s to km/h
      windDirection: data.wind.deg,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: new Date().toISOString(),
      source: 'OpenWeatherMap'
    };

    res.json(weatherData);
  } catch (err) {
    console.error('[Weather] Error fetching weather:', err.message);
    res.status(500).json({
      error: 'Failed to fetch weather data',
      message: err.message
    });
  }
});

/**
 * GET /api/config
 * Returns public configuration (no sensitive data)
 */
app.get('/api/config', async (req, res) => {
  const config = await readJSONFile(CONFIG_PATH);

  if (!config) {
    return res.status(404).json({
      error: 'Configuration not available',
      message: 'config.json not found'
    });
  }

  // Only return public config (strip sensitive fields)
  const publicConfig = {
    display: config.display,
    timing: config.timing,
    branding: config.branding,
    socialMedia: config.socialMedia,
    sponsors: config.sponsors,
    news: config.news,
    weather: {
      location: config.weather?.location,
      bomStationId: config.weather?.bomStationId
    }
  };

  res.json(publicConfig);
});

/**
 * GET /api/config/full
 * Returns complete configuration for admin interface
 */
app.get('/api/config/full', async (req, res) => {
  const config = await readJSONFile(CONFIG_PATH);

  if (!config) {
    return res.status(404).json({
      error: 'Configuration not available',
      message: 'config.json not found'
    });
  }

  res.json(config);
});

/**
 * POST /api/config/update
 * Updates configuration with validation
 */
app.post('/api/config/update', async (req, res) => {
  try {
    const newConfig = req.body;

    // Basic validation
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({
        error: 'Invalid configuration',
        message: 'Request body must be a valid JSON object'
      });
    }

    // Validate required sections exist (only those actually used by the frontend)
    const requiredSections = ['display', 'timing', 'branding', 'news', 'weather', 'socialMedia'];
    const missingSections = requiredSections.filter(section => !newConfig[section]);

    if (missingSections.length > 0) {
      return res.status(400).json({
        error: 'Missing required sections',
        message: `Configuration must include: ${missingSections.join(', ')}`
      });
    }

    // Create backup of current config
    const currentConfig = await readJSONFile(CONFIG_PATH);
    if (currentConfig) {
      const backupPath = path.join(__dirname, 'config.json.backup');
      await fs.writeFile(backupPath, JSON.stringify(currentConfig, null, 2));
      console.log('[Config] Backup created at config.json.backup');
    }

    // Write new configuration
    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    console.log('[Config] Configuration updated successfully');

    res.json({
      success: true,
      message: 'Configuration updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Config] Error updating configuration:', err);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: err.message
    });
  }
});

/**
 * POST /api/config/reset
 * Restore configuration from backup
 */
app.post('/api/config/reset', async (req, res) => {
  try {
    const backupPath = path.join(__dirname, 'config.json.backup');

    if (!existsSync(backupPath)) {
      return res.status(404).json({
        error: 'No backup available',
        message: 'config.json.backup not found'
      });
    }

    const backupConfig = await readJSONFile(backupPath);
    if (!backupConfig) {
      return res.status(500).json({
        error: 'Failed to read backup',
        message: 'Backup file is corrupted or invalid'
      });
    }

    await fs.writeFile(CONFIG_PATH, JSON.stringify(backupConfig, null, 2));
    console.log('[Config] Configuration restored from backup');

    res.json({
      success: true,
      message: 'Configuration restored from backup',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Config] Error restoring configuration:', err);
    res.status(500).json({
      error: 'Failed to restore configuration',
      message: err.message
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  const galleryAge = await getFileAge(path.join(DATA_DIR, 'gallery-data.json'));
  const eventsAge = await getFileAge(path.join(DATA_DIR, 'events-data.json'));
  const newsAge = await getFileAge(path.join(DATA_DIR, 'news-data.json'));

  // Read data files to get item counts
  const galleryData = await readJSONFile(path.join(DATA_DIR, 'gallery-data.json'));
  const eventsData = await readJSONFile(path.join(DATA_DIR, 'events-data.json'));
  const newsData = await readJSONFile(path.join(DATA_DIR, 'news-data.json'));

  const status = {
    server: 'running',
    timestamp: new Date().toISOString(),
    dataFiles: {
      gallery: {
        exists: existsSync(path.join(DATA_DIR, 'gallery-data.json')),
        ageMinutes: Math.round(galleryAge),
        stale: galleryAge > 120
      },
      events: {
        exists: existsSync(path.join(DATA_DIR, 'events-data.json')),
        ageMinutes: Math.round(eventsAge),
        stale: eventsAge > 120
      },
      news: {
        exists: existsSync(path.join(DATA_DIR, 'news-data.json')),
        ageMinutes: Math.round(newsAge),
        stale: newsAge > 120
      }
    },
    // Add data object for ConfigEditor compatibility
    data: {
      gallery: galleryData ? {
        itemCount: galleryData.albums?.length || galleryData.totalAlbums || 0
      } : null,
      events: eventsData ? {
        itemCount: eventsData.events?.length || eventsData.totalEvents || 0
      } : null,
      news: newsData ? {
        itemCount: newsData.news?.length || newsData.totalArticles || 0
      } : null
    }
  };

  const isHealthy = status.dataFiles.gallery.exists &&
                    status.dataFiles.events.exists &&
                    status.dataFiles.news.exists &&
                    galleryAge < 240 && // Less than 4 hours old
                    eventsAge < 240 &&
                    newsAge < 240;

  // Add status field for ConfigEditor
  status.status = isHealthy ? 'healthy' : 'degraded';

  res.status(isHealthy ? 200 : 503).json(status);
});

// ============================================================
// SCRAPER CONTROL ENDPOINTS
// ============================================================

/**
 * GET /api/scraper/status
 * Get scraper status and schedule
 */
app.get('/api/scraper/status', (req, res) => {
  const status = scheduler.getStatus();
  res.json(status);
});

/**
 * POST /api/scraper/trigger
 * Manually trigger scraper run (bypasses schedule checks)
 */
app.post('/api/scraper/trigger', async (req, res) => {
  console.log('[API] Manual scraper trigger requested');
  const result = await scheduler.runScraper(true); // force=true to bypass schedule
  res.json(result);
});

/**
 * POST /api/scraper/schedule
 * Update scraper schedule
 */
app.post('/api/scraper/schedule', async (req, res) => {
  try {
    const { schedule, enabled } = req.body;

    // Validate cron format if provided
    if (schedule) {
      const cron = await import('node-cron');
      if (!cron.default.validate(schedule)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid cron schedule format'
        });
      }
    }

    // Read current config
    const currentConfig = await readJSONFile(CONFIG_PATH);
    if (!currentConfig) {
      return res.status(500).json({
        success: false,
        error: 'Could not read config'
      });
    }

    // Update scraper config
    const newConfig = { ...currentConfig };
    newConfig.scraper = newConfig.scraper || {};

    if (schedule) {
      newConfig.scraper.schedule = schedule;
    }

    if (typeof enabled !== 'undefined') {
      newConfig.scraper.scheduleEnabled = enabled;
    }

    // Create backup
    try {
      const backupPath = `${CONFIG_PATH}.backup`;
      await fs.writeFile(backupPath, JSON.stringify(currentConfig, null, 2));
    } catch (err) {
      console.warn('[API] Could not create config backup:', err.message);
    }

    // Save updated config
    await fs.writeFile(CONFIG_PATH, JSON.stringify(newConfig, null, 2));

    // Update scheduler
    scheduler.updateSchedule(schedule, enabled);

    console.log('[API] Scraper schedule updated:', { schedule, enabled });

    res.json({
      success: true,
      status: scheduler.getStatus()
    });

  } catch (err) {
    console.error('[API] Error updating scraper schedule:', err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// ============================================================
// SERVE REACT APP
// ============================================================

/**
 * Serve React app for all other routes
 */
app.get('*', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  
  if (existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send(`
      <html>
        <head><title>LMRC Noticeboard</title></head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>🚣 LMRC Noticeboard</h1>
          <p>React app not built yet. Run: <code>npm run build</code></p>
          <hr>
          <p>API endpoints available:</p>
          <ul style="list-style: none; padding: 0;">
            <li><a href="/api/gallery">/api/gallery</a></li>
            <li><a href="/api/events">/api/events</a></li>
            <li><a href="/api/news">/api/news</a></li>
            <li><a href="/api/config">/api/config</a></li>
            <li><a href="/api/health">/api/health</a></li>
          </ul>
        </body>
      </html>
    `);
  }
});

// ============================================================
// INITIALIZE SCRAPER SCHEDULER
// ============================================================

// Read config synchronously for scheduler initialization
let config = {};
try {
  const configData = existsSync(CONFIG_PATH)
    ? await fs.readFile(CONFIG_PATH, 'utf-8')
    : '{}';
  config = JSON.parse(configData);
} catch (err) {
  console.error('[Scheduler] Error loading config:', err.message);
  config = {};
}

// Initialize scheduler
const scheduler = new ScraperScheduler(config);

// Run scraper on startup if configured (with delay to ensure network is ready)
if (config.scraper?.runOnStartup !== false) {
  const startupDelay = config.scraper?.startupDelaySeconds || 10;
  console.log(`[Scheduler] Will run scraper ${startupDelay} seconds after startup (waiting for network)...`);

  setTimeout(() => {
    console.log('[Scheduler] Running scraper on startup...');
    scheduler.runScraper().then(result => {
      if (result.success) {
        console.log('[Scheduler] Startup scrape completed successfully');
      } else {
        console.error('[Scheduler] Startup scrape failed:', result.error || result.message);
      }
    });
  }, startupDelay * 1000);
}

// Start scheduled scraping
scheduler.start();

// Watch for config changes to update schedule
let configWatcher = null;
try {
  const fsModule = await import('fs');
  configWatcher = fsModule.watch(CONFIG_PATH, async (eventType) => {
    if (eventType === 'change') {
      try {
        const newConfigData = await fs.readFile(CONFIG_PATH, 'utf-8');
        const newConfig = JSON.parse(newConfigData);
        scheduler.config = newConfig;
        scheduler.start(); // Restart with new schedule
        console.log('[Scheduler] Config updated, schedule reloaded');
      } catch (err) {
        console.error('[Scheduler] Error reloading config:', err.message);
      }
    }
  });
} catch (err) {
  console.warn('[Scheduler] Could not watch config file:', err.message);
}

// Export scheduler for API endpoints
export { scheduler };

// ============================================================
// START SERVER
// ============================================================

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  LMRC NOTICEBOARD SERVER');
  console.log('═══════════════════════════════════════════════');
  console.log(`Server running on: http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  - http://localhost:${PORT}/api/gallery`);
  console.log(`  - http://localhost:${PORT}/api/events`);
  console.log(`  - http://localhost:${PORT}/api/news`);
  console.log(`  - http://localhost:${PORT}/api/config`);
  console.log(`  - http://localhost:${PORT}/api/health`);
  console.log('═══════════════════════════════════════════════\n');
});

export default app;