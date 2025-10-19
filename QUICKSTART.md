# 🚀 LMRC Noticeboard - Quick Start Guide

Get your noticeboard up and running in 30 minutes!

---

## 📋 What You Need

### Hardware
- ✅ Raspberry Pi 5 (8GB) or similar computer
- ✅ 50" TV with HDMI
- ✅ MicroSD card (64GB, high-endurance)
- ✅ Keyboard + mouse (for setup only)
- ✅ Internet connection (WiFi or Ethernet)

### Software & Credentials
- ✅ RevSport username and password
- ✅ Club logo (PNG format)
- ✅ Sponsor logos (optional)

---

## ⚡ 5-Minute Test Setup (Development)

Test on your laptop before deploying to Pi:

### 1. Install Prerequisites

```bash
# Install Node.js 20.x from https://nodejs.org/
node --version  # Should be 20.x or higher
```

### 2. Get the Code

```bash
# Extract the zip or clone from git
cd lmrc-noticeboard
```

### 3. Install Dependencies

```bash
npm install
# This takes 5-10 minutes (downloads Chromium for Puppeteer)
```

### 4. Configure

```bash
# Run setup wizard
npm run setup

# It will ask for:
# - RevSport username (e.g., gevans11)
# - RevSport password
# - Club name
# - Social media handles
```

### 5. Test Scraper

```bash
# Run a test scrape
npm run scrape

# Check if data was collected
ls -lh data/
# You should see: gallery-data.json, events-data.json, news-data.json
```

### 6. Build & Run

```bash
# Build the React app
npm run build

# Start the server
npm start

# Open browser: http://localhost:3000
```

🎉 **If you see the noticeboard, you're ready to deploy to Raspberry Pi!**

---

## 🥧 Raspberry Pi Deployment (30 Minutes)

### Step 1: Prepare Raspberry Pi (10 min)

1. **Flash SD Card**
   - Download Raspberry Pi Imager: https://www.raspberrypi.com/software/
   - Flash "Raspberry Pi OS Lite (64-bit)"
   - Enable SSH (create empty `ssh` file in boot partition)
   - Insert SD card and power on Pi

2. **Connect to Pi**
   ```bash
   # Find Pi IP address from your router, or use:
   ssh pi@raspberrypi.local
   # Default password: raspberry
   ```

3. **Update System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   passwd  # Change default password
   ```

### Step 2: Install Software (10 min)

```bash
# Use the automated install script
cd /home/pi
git clone <your-repo-url> lmrc-noticeboard
cd lmrc-noticeboard
chmod +x install.sh
./install.sh

# Follow the prompts - it will:
# - Install Node.js, Chromium, PM2
# - Run setup wizard
# - Build the app
# - Configure autostart
```

**OR** manually follow these commands:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs chromium-browser git

# Install PM2
sudo npm install -g pm2

# Copy application files
# (If you didn't clone from git, copy via SCP)

# Install dependencies
cd /home/pi/lmrc-noticeboard
npm install

# Setup
npm run setup
npm run build

# Start server with PM2
pm2 start server.js --name lmrc-noticeboard
pm2 startup  # Run the command it prints
pm2 save
```

### Step 3: Configure Kiosk Mode (5 min)

```bash
# Setup autostart
mkdir -p /home/pi/.config/lxsession/LXDE-pi
nano /home/pi/.config/lxsession/LXDE-pi/autostart
```

Paste this:

```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash
@xset s off
@xset -dpms
@xset s noblank
@bash -c 'sleep 10 && chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen --disable-infobars --noerrdialogs --disable-session-crashed-bubble'
```

Save (Ctrl+X, Y, Enter).

```bash
# Enable auto-login
sudo raspi-config
# System Options → Boot / Auto Login → Desktop Autologin
# Finish and reboot
sudo reboot
```

### Step 4: Setup Automated Scraping (2 min)

```bash
# Add hourly cron job
crontab -e

# Add this line:
5 * * * * cd /home/pi/lmrc-noticeboard && /usr/bin/node scraper/noticeboard-scraper.js >> /home/pi/lmrc-noticeboard/scraper.log 2>&1

# Save and exit
```

### Step 5: Add Assets (3 min)

```bash
# From your computer, copy assets via SCP:
scp logo.png pi@raspberrypi.local:/home/pi/lmrc-noticeboard/public/assets/
scp sponsor1.png pi@raspberrypi.local:/home/pi/lmrc-noticeboard/public/assets/sponsors/
scp sponsor2.png pi@raspberrypi.local:/home/pi/lmrc-noticeboard/public/assets/sponsors/

# Update config.json with sponsor details
ssh pi@raspberrypi.local
nano /home/pi/lmrc-noticeboard/config.json
```

---

## ✅ Verification Checklist

After reboot, verify everything works:

- [ ] TV displays noticeboard in fullscreen
- [ ] Header shows club logo, date/time, weather
- [ ] Left panel shows upcoming events
- [ ] Center rotates through photos/news
- [ ] Right panel shows news items
- [ ] Footer shows sponsors and social media
- [ ] Content updates hourly

### Quick Tests

```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Check server is running
pm2 status
# Should show: lmrc-noticeboard | online

# Check data files exist and are recent
ls -lh /home/pi/lmrc-noticeboard/data/
# Should show files modified within last hour

# Check API is working
curl http://localhost:3000/api/health
# Should return: {"server":"running",...}

# Check scraper log
tail -20 /home/pi/lmrc-noticeboard/scraper.log
# Should show successful scrapes

# Check cron is configured
crontab -l
# Should show hourly scraper job
```

---

## 🎨 Customization Checklist

After initial setup, customize these:

### Required Customizations

- [ ] Add club logo (`public/assets/logo.png`)
- [ ] Update club colors in `config.json`
- [ ] Set correct BOM weather station ID
- [ ] Add Facebook/Instagram handles
- [ ] Add sponsor logos and names

### Optional Customizations

- [ ] Adjust rotation timing (default: 15s/45s/30s)
- [ ] Change max events displayed (default: 7)
- [ ] Change max news items (default: 7)
- [ ] Add fallback images for when no content available
- [ ] Customize club tagline

### Configuration File Locations

```bash
/home/pi/lmrc-noticeboard/config.json    # Main config
/home/pi/lmrc-noticeboard/.env           # Credentials
/home/pi/lmrc-noticeboard/public/assets/ # Club assets
```

---

## 🔧 Common Adjustments

### Change Rotation Speed

```bash
nano /home/pi/lmrc-noticeboard/config.json
```

Find `timing` section:
```json
"timing": {
  "heroRotationSeconds": 20,         // Change from 15
  "newsPanelRotationSeconds": 60,    // Change from 45
  "sponsorRotationSeconds": 45       // Change from 30
}
```

**Changes apply automatically within 60 seconds!**

### Add/Update Sponsors

```bash
# 1. Copy logo to Pi
scp new-sponsor.png pi@raspberrypi.local:/home/pi/lmrc-noticeboard/public/assets/sponsors/

# 2. Edit config
ssh pi@raspberrypi.local
nano /home/pi/lmrc-noticeboard/config.json
```

Add to `sponsors` array:
```json
"sponsors": [
  {
    "name": "New Sponsor",
    "logoPath": "/assets/sponsors/new-sponsor.png",
    "url": "https://newsponsor.com"
  }
]
```

### Update RevSport Credentials

```bash
ssh pi@raspberrypi.local
nano /home/pi/lmrc-noticeboard/.env
```

Update credentials, save, then:
```bash
npm run scrape  # Test new credentials
```

---

## 🆘 Troubleshooting

### Problem: Blank Screen

**Solution:**
```bash
ssh pi@raspberrypi.local
pm2 status
pm2 restart lmrc-noticeboard
sudo reboot
```

### Problem: Old Data Showing

**Solution:**
```bash
ssh pi@raspberrypi.local
npm run scrape  # Manual scrape
tail -f scraper.log  # Watch for errors
```

### Problem: No Photos

**Solution:**
Check gallery settings in `config.json`:
```json
"gallery": {
  "publicOnly": false,  // Try changing to false
  "maxAlbumsToDisplay": 10
}
```

### Problem: Wrong Weather

**Solution:**
Update BOM station ID in `config.json`:
```json
"weather": {
  "location": "Morisset",
  "bomStationId": "061055"  // Find your station at bom.gov.au
}
```

### Get More Help

1. Check logs: `pm2 logs lmrc-noticeboard`
2. Check scraper: `tail -100 scraper.log`
3. Test API: `curl http://localhost:3000/api/health`
4. See full troubleshooting: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📱 Remote Management

### Access Pi Remotely

```bash
# Enable VNC (optional)
sudo raspi-config
# Interface Options → VNC → Enable

# Install VNC Viewer on your computer
# Connect to: raspberrypi.local
```

### View Logs Remotely

```bash
ssh pi@raspberrypi.local
pm2 logs lmrc-noticeboard --lines 50
tail -f scraper.log
```

### Update Config Remotely

```bash
# Edit directly via SSH
ssh pi@raspberrypi.local
nano /home/pi/lmrc-noticeboard/config.json

# Or edit locally and copy
scp config.json pi@raspberrypi.local:/home/pi/lmrc-noticeboard/
```

---

## 🎯 Success Criteria

Your noticeboard is working properly when:

✅ Displays automatically on boot  
✅ Shows current date/time and weather  
✅ Rotates through club photos  
✅ Lists upcoming events  
✅ Shows recent news and results  
✅ Displays sponsor logos  
✅ Updates content hourly  
✅ Runs 24/7 without intervention  

---

## 📚 Next Steps

- ✅ Test for 24 hours to ensure stability
- ✅ Train committee members on basic config changes
- ✅ Setup email alerts for failures (see DEPLOYMENT.md)
- ✅ Schedule monthly maintenance checks
- ✅ Consider purchasing spare Pi as backup

---

## 🎉 You're Done!

Your noticeboard should now be running smoothly. 

For detailed documentation, see:
- **[README.md](./README.md)** - Overview and features
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **config.json** - All configuration options

**Enjoy your new digital noticeboard!** 🚣‍♂️