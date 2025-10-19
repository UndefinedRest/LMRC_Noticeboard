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
    weather: {
      location: config.weather?.location,
      bomStationId: config.weather?.bomStationId
    }
  };

  res.json(publicConfig);
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  const galleryAge = await getFileAge(path.join(DATA_DIR, 'gallery-data.json'));
  const eventsAge = await getFileAge(path.join(DATA_DIR, 'events-data.json'));
  const newsAge = await getFileAge(path.join(DATA_DIR, 'news-data.json'));

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
    }
  };

  const isHealthy = status.dataFiles.gallery.exists &&
                    status.dataFiles.events.exists &&
                    status.dataFiles.news.exists &&
                    galleryAge < 240 && // Less than 4 hours old
                    eventsAge < 240 &&
                    newsAge < 240;

  res.status(isHealthy ? 200 : 503).json(status);
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