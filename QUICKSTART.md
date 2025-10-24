# LMRC Noticeboard - Quick Reference Card

**For complete deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md)**

---

## Getting Started

**Choose your path:**
- 🚀 Test locally → See [DEPLOYMENT.md#quick-test-5-minutes](DEPLOYMENT.md#quick-test-5-minutes)
- ⚡ Fast Pi setup → See [DEPLOYMENT.md#express-setup-30-minutes](DEPLOYMENT.md#express-setup-30-minutes)
- 📖 Detailed guide → See [DEPLOYMENT.md#complete-guide-2-3-hours](DEPLOYMENT.md#complete-guide-2-3-hours)

---

## Essential Commands

### Local Development
```bash
npm install              # Install dependencies
npm run scrape           # Test scraper
npm run build            # Build React app
npm start                # Start server
npm run dev              # Dev mode (server + React)
```

### Production (Raspberry Pi)
```bash
# Server Management
pm2 status                          # Check server status
pm2 restart lmrc-noticeboard        # Restart server
pm2 logs lmrc-noticeboard           # View logs
pm2 save                            # Save PM2 process list

# Scraper
npm run scrape                      # Manual scrape
curl http://localhost:3000/api/scraper/status          # Check scheduler
curl -X POST http://localhost:3000/api/scraper/trigger  # Trigger scrape

# System
sudo reboot                         # Restart Pi
df -h                              # Check disk space
vcgencmd measure_temp              # Check temperature
```

---

## Web Interfaces

```
http://localhost:3000                    # Main noticeboard display
http://localhost:3000/config             # Configuration editor
http://localhost:3000/api/health         # Server health check
http://localhost:3000/api/scraper/status # Scraper status
```

**On network:**
Replace `localhost` with `lmrc-noticeboard.local` or Pi's IP address.

---

## File Locations

```
lmrc-noticeboard/
├── config.json              # All settings (edit via web UI)
├── server.js                # Express server
├── server-scheduler.js      # Built-in scraper scheduler
├── data/                    # Scraped data (auto-generated)
│   ├── gallery-data.json
│   ├── events-data.json
│   ├── news-data.json
│   └── sponsors-data.json
├── public/                  # Built React app
│   └── assets/              # Logo and images
│       ├── logo.png         # Club logo
│       └── sponsors/        # Sponsor logos
├── src/                     # React source
│   ├── Noticeboard.jsx      # Main component
│   └── ConfigEditor.jsx     # Config UI
├── scraper/                 # Scraper
│   └── noticeboard-scraper.js
└── scraper.log              # Scraper logs
```

---

## Configuration

**Use Web UI (Recommended):**
1. Open `http://localhost:3000/config`
2. Make changes in the form
3. Click "Save Changes"
4. Changes apply in 60 seconds (no restart needed)

**Common Settings:**
- **Timing:** `config.timing` - Rotation speeds, refresh intervals
- **Branding:** `config.branding` - Colors, logo, club name
- **Scraper:** `config.scraper` - Schedule, enable/disable
- **Sponsors:** `config.sponsors` - Sponsor array
- **Weather:** `config.weather.bomStationId` - BOM station ID

---

## Scraper Scheduler

**Default Settings:**
- Enabled: ✅
- Schedule: Every 4 hours (`0 */4 * * *`)
- Runs on startup: ✅

**Common Schedules:**
```
0 * * * *      # Every hour
0 */2 * * *    # Every 2 hours
0 */4 * * *    # Every 4 hours (default)
0 */6 * * *    # Every 6 hours
0 6 * * *      # Once daily at 6am
```

**Configure via Web UI:**
`http://localhost:3000/config` → Scraper Controls section

---

## Troubleshooting

### Server won't start
```bash
pm2 status                    # Check if running
pm2 logs --lines 50           # Check errors
sudo lsof -i :3000            # Check if port in use
```

### No data showing
```bash
npm run scrape                # Run manually
ls -lh data/                  # Check files exist
tail -50 scraper.log          # Check for errors
```

### Noticeboard doesn't auto-start
```bash
pm2 startup                   # Re-enable PM2 startup
pm2 save                      # Save process list
cat ~/.config/lxsession/LXDE-pi/autostart  # Check kiosk config
```

### Screen goes black
```bash
# Check TV settings (disable auto-power-off, sleep timer)
# Check autostart file has xset commands
nano ~/.config/lxsession/LXDE-pi/autostart
```

**For complete troubleshooting, see [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)**

---

## Architecture Quick Reference

**3-Layer System:**
1. **Scraper** → Cheerio HTML parser → Scrapes RevSport → Saves JSON files
2. **Server** → Express API → Serves JSON + built React app
3. **Frontend** → React SPA → Polls API → Displays content

**Data Flow:**
```
RevSport Website
    ↓ (Cheerio scraper, ~4s)
JSON files (data/)
    ↓ (Express API)
React Frontend
    ↓ (Chromium kiosk mode)
TV Display
```

**No credentials needed** - RevSport pages are public.

---

## Quick Customization

### Add Club Logo
```bash
# Copy logo.png to:
public/assets/logo.png

# Update in config:
http://localhost:3000/config → Branding → Club Logo Path
```

### Add Sponsor
```bash
# 1. Copy sponsor logo
public/assets/sponsors/sponsor-name.png

# 2. Add to config via web UI:
http://localhost:3000/config → Sponsors → Add Sponsor
```

### Change Colors
```bash
# Via web UI:
http://localhost:3000/config → Branding → Club Colors
# Pick colors using color picker
```

### Adjust Rotation Speed
```bash
# Via web UI:
http://localhost:3000/config → Timing
# Change heroRotationSeconds, newsPanelRotationSeconds, etc.
```

---

## API Endpoints

### Public Endpoints
```
GET  /api/health            # Server health
GET  /api/gallery           # Gallery data
GET  /api/events            # Events data
GET  /api/news              # News data
GET  /api/config            # Public config
```

### Configuration Endpoints
```
GET  /api/config/full       # Complete configuration
POST /api/config/update     # Update configuration
POST /api/config/reset      # Restore from backup
```

### Scraper Endpoints
```
GET  /api/scraper/status    # Scheduler status
POST /api/scraper/trigger   # Manual scrape trigger
POST /api/scraper/schedule  # Update schedule
```

---

## Key Features

✅ **No credentials required** - Scrapes public RevSport pages
✅ **Built-in scheduler** - No cron setup needed
✅ **Web-based config** - Edit settings via browser
✅ **Fast & lightweight** - Cheerio parser (~4s, ~50MB)
✅ **Auto-updates** - Polls for new data every 60s
✅ **Portable** - Works with any RevSport club website
✅ **Offline capable** - Displays last known data if scraper fails

---

## Links

- **[README.md](README.md)** - Project overview and features
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Complete deployment guide
- **[CLAUDE.md](CLAUDE.md)** - Architecture and development guide
- **[config.json](config.json)** - All configuration options

---

## Support

**Common Issues:**
- See [DEPLOYMENT.md#troubleshooting](DEPLOYMENT.md#troubleshooting)

**For Advanced Topics:**
- Architecture details → [CLAUDE.md](CLAUDE.md)
- Making code changes → [CLAUDE.md](CLAUDE.md)
- Adding new features → [CLAUDE.md](CLAUDE.md)

**Installation Help:**
- Quick test (5 min) → [DEPLOYMENT.md#quick-test-5-minutes](DEPLOYMENT.md#quick-test-5-minutes)
- Express setup (30 min) → [DEPLOYMENT.md#express-setup-30-minutes](DEPLOYMENT.md#express-setup-30-minutes)
- Complete guide (2-3 hrs) → [DEPLOYMENT.md#complete-guide-2-3-hours](DEPLOYMENT.md#complete-guide-2-3-hours)

---

**TL;DR:**
1. `npm install && npm run build && npm start` → Test locally
2. See [DEPLOYMENT.md](DEPLOYMENT.md) for Raspberry Pi setup
3. Configure via `http://localhost:3000/config`
4. Done! 🚣‍♂️
