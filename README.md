# 🚣 LMRC Digital Noticeboard

A self-updating digital noticeboard for Lake Macquarie Rowing Club, displayed on a TV in the boatshed. Automatically pulls content from the club's RevSport website including photo galleries, upcoming events, news, and results.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

> 📚 **Part of the LMRC Digital Solution Suite**
>
> This is one component of a multi-project solution. For complete documentation:
> - **Solution documentation** → See [../docs/](../docs/)
> - **Architecture overview** → See [../docs/architecture/overview.md](../docs/architecture/overview.md)
> - **Product roadmap** → See [../docs/planning/roadmap.md](../docs/planning/roadmap.md)
> - **Deployment to Raspberry Pi** → See [../docs/deployment/production-setup.md](../docs/deployment/production-setup.md)
> - **Getting started (dev)** → See [../docs/development/getting-started.md](../docs/development/getting-started.md)

---

## 📋 Features

- **🖼️ Photo Gallery**: Rotating display of recent club photos from RevSport
- **📅 Upcoming Events**: Always-visible list of next 7 events
- **📰 News & Results**: Latest announcements and race results
- **🌤️ Weather**: Current temperature and conditions from BOM
- **🏆 Sponsors**: Rotating sponsor acknowledgments
- **📱 Social Media**: Club Facebook and Instagram handles
- **🔄 Auto-Updating**: Hourly refresh from RevSport, no manual updates needed
- **⚙️ Configurable**: Easy JSON-based configuration for timing, branding, and content

---

## 🎯 Quick Start

### Prerequisites

- Node.js 20.x or higher
- RevSport account credentials
- For production: Raspberry Pi 5 (8GB) or Intel NUC

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/lmrc-noticeboard.git
cd lmrc-noticeboard

# Install dependencies
npm install

# Run setup wizard
npm run setup

# Build React app
npm run build

# Start server
npm start
```

Visit `http://localhost:3000` to see the noticeboard!

---

## 📁 Project Structure

```
lmrc-noticeboard/
├── server.js                    # Express API server
├── package.json                 # Dependencies
├── config.json                  # Configuration
├── .env                         # Credentials (create from .env.example)
├── scraper/
│   └── noticeboard-scraper.js  # RevSport data scraper
├── src/
│   └── Noticeboard.jsx         # React application
├── public/                      # Built React app (generated)
├── data/                        # Scraped data (generated)
├── scripts/
│   └── setup.js                # Setup wizard
├── assets/                      # Static assets (logos, images)
└── DEPLOYMENT.md               # Full deployment guide
```

---

## ⚙️ Configuration

### Environment Variables (`.env`)

```bash
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password
PORT=3000
NODE_ENV=production
```

### Application Config (`config.json`)

Key configuration sections:

- **`timing`**: Rotation speeds for all content areas
- **`branding`**: Club name, logo, colors, tagline
- **`socialMedia`**: Facebook and Instagram handles
- **`sponsors`**: Sponsor logos and names
- **`gallery`**: Photo settings (max albums, public only, etc.)
- **`events`**: Event display settings
- **`news`**: News feed settings
- **`weather`**: BOM station ID and location

See `config.json` for full options.

---

## 🚀 Deployment

### For Production (Raspberry Pi / NUC)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete step-by-step guide including:

- Hardware setup
- Raspberry Pi OS installation
- Chromium kiosk mode configuration
- Automated scraping with cron
- PM2 process management
- Troubleshooting guide

### Quick Production Setup

```bash
# On Raspberry Pi:
cd /home/pi/lmrc-noticeboard

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Add your credentials

# Build app
npm run build

# Setup PM2
pm2 start server.js --name lmrc-noticeboard
pm2 startup
pm2 save

# Setup cron for hourly scraping
crontab -e
# Add: 5 * * * * cd /home/pi/lmrc-noticeboard && node scraper/noticeboard-scraper.js >> scraper.log 2>&1

# Configure kiosk mode (see DEPLOYMENT.md)
```

---

## 🔧 Development

### Run in Development Mode

```bash
# Start both server and React dev server
npm run dev

# Or separately:
npm run dev:server   # Server on port 3000
npm run dev:react    # React dev server on port 5173
```

### Manual Scraping

```bash
# Run scraper once
npm run scrape

# Check generated data
ls -lh data/
cat data/gallery-data.json | jq
```

### Testing

```bash
# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/gallery
curl http://localhost:3000/api/events
curl http://localhost:3000/api/news
curl http://localhost:3000/api/config
```

---

## 🎨 Customization

### Change Colors

Edit `config.json`:

```json
"branding": {
  "clubColors": {
    "primary": "#003366",    // Dark blue
    "secondary": "#0066CC",  // Medium blue
    "accent": "#FFD700",     // Gold
    "background": "#F5F5F5", // Light grey
    "text": "#333333"        // Dark grey
  }
}
```

### Change Rotation Timing

Edit `config.json`:

```json
"timing": {
  "heroRotationSeconds": 15,        // Center content
  "newsPanelRotationSeconds": 45,   // Right panel
  "sponsorRotationSeconds": 30,     // Footer sponsors
  "dataRefreshSeconds": 60,         // API polling
  "weatherRefreshMinutes": 30       // Weather updates
}
```

### Add Sponsors

1. Add logo image to `public/assets/sponsors/`
2. Edit `config.json`:

```json
"sponsors": [
  {
    "name": "Sponsor Name",
    "logoPath": "/assets/sponsors/logo.png",
    "url": "https://sponsor.com"
  }
]
```

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────┐
│  Raspberry Pi / NUC                                 │
│                                                     │
│  ┌──────────────────────────────────────────────┐ │
│  │  Node.js Scraper (Puppeteer)                 │ │
│  │  - Authenticates with RevSport               │ │
│  │  - Scrapes gallery/events/news               │ │
│  │  - Saves to local JSON files                 │ │
│  │  - Runs hourly via cron                      │ │
│  └──────────────────────────────────────────────┘ │
│                        ↓                            │
│  ┌──────────────────────────────────────────────┐ │
│  │  Express API Server (localhost:3000)         │ │
│  │  - Serves React app                          │ │
│  │  - Provides JSON data via /api/* endpoints   │ │
│  │  - Managed by PM2                            │ │
│  └──────────────────────────────────────────────┘ │
│                        ↓                            │
│  ┌──────────────────────────────────────────────┐ │
│  │  Chromium Browser (Kiosk Mode)               │ │
│  │  - Fullscreen React app                      │ │
│  │  - Auto-starts on boot                       │ │
│  │  - No CORS issues (same origin)              │ │
│  └──────────────────────────────────────────────┘ │
│                                                     │
└─────────────────────────────────────────────────────┘
                       ↓
              BOM Weather API
          (external, CORS-enabled)
```

### Why This Architecture?

✅ **No CORS Issues**: Server-side scraping avoids browser restrictions  
✅ **Reliable Auth**: Puppeteer handles RevSport authentication  
✅ **Simple API**: React app just reads local JSON via localhost  
✅ **Single Device**: Everything runs on one Pi/NUC  
✅ **Offline Capable**: Continues displaying last known data if scraper fails  

---

## 🐛 Troubleshooting

### Server Won't Start

```bash
# Check if port is in use
sudo lsof -i :3000

# Check PM2 logs
pm2 logs lmrc-noticeboard

# Restart server
pm2 restart lmrc-noticeboard
```

### Scraper Fails

```bash
# Run manually to see errors
npm run scrape

# Check logs
tail -100 scraper.log

# Common fixes:
# - Update credentials in .env
# - Check internet connection
# - Verify RevSport site is accessible
```

### No Data Showing

```bash
# Check data files exist
ls -lh data/

# Check data is valid JSON
cat data/gallery-data.json | jq

# Test API endpoints
curl http://localhost:3000/api/gallery | jq
```

### Display Issues

```bash
# Rebuild React app
npm run build

# Verify build exists
ls -lh public/

# Check browser console for errors
# (Open browser dev tools with F12)
```

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for comprehensive troubleshooting guide.

---

## 📝 Maintenance

### Regular Tasks

**Weekly**: Verify display is working and content is current

**Monthly**: 
- Check disk space: `df -h`
- Review logs: `pm2 logs` and `tail scraper.log`
- Verify scraper is running: `crontab -l`

**As Needed**:
- Update sponsors in `config.json`
- Change timing settings
- Update RevSport credentials if changed

### Updating Configuration

Changes to `config.json` are automatically detected within 60 seconds (no restart needed).

For code updates:

```bash
git pull
npm install
npm run build
pm2 restart lmrc-noticeboard
```

---

## 🔒 Security

- RevSport credentials stored in `.env` (never commit to git)
- `.env` included in `.gitignore`
- API serves read-only data
- No external network access from browser (except BOM weather API)
- Firewall recommended for production deployment

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

This is a custom application for Lake Macquarie Rowing Club. If you're from another rowing club and want to adapt this:

1. Fork the repository
2. Update `config.json` with your club details
3. Update RevSport URLs in scraper if your club uses different subdomain
4. Test thoroughly before deploying

---

## 🆘 Support

For issues or questions:

1. Check **[DEPLOYMENT.md](./DEPLOYMENT.md)** troubleshooting section
2. Review logs: `pm2 logs` and `scraper.log`
3. Contact club committee for technical support

---

## 📚 Additional Resources

- [Raspberry Pi Documentation](https://www.raspberrypi.com/documentation/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Bureau of Meteorology](http://www.bom.gov.au/)
- [RevSport Platform](https://www.revsport.com.au/)

---

## ✨ Credits

Built for Lake Macquarie Rowing Club

**Technologies Used**:
- Node.js + Express
- React 18
- Puppeteer
- PM2
- Tailwind CSS (utility classes)
- Bureau of Meteorology API

---

**Enjoy your new digital noticeboard! 🚣‍♂️**#   L M R C _ N o t i c e b o a r d  
 