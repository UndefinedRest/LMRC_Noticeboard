# LMRC Noticeboard - Deployment Guide

Complete guide to deploying the LMRC Digital Noticeboard on Raspberry Pi 5 or NUC.

---

## Table of Contents

1. [Hardware Setup](#hardware-setup)
2. [Software Installation](#software-installation)
3. [Application Setup](#application-setup)
4. [Automated Scraping](#automated-scraping)
5. [Kiosk Mode Configuration](#kiosk-mode-configuration)
6. [Troubleshooting](#troubleshooting)
7. [Maintenance](#maintenance)

---

## 1. Hardware Setup

### Required Hardware

- Raspberry Pi 5 (8GB) or Intel NUC
- 50" TV display
- MicroSD card (64GB, high-endurance) or SSD
- HDMI cable
- Power supply
- Keyboard & mouse (for initial setup only)
- Ethernet cable or WiFi

### Physical Installation

1. **Mount TV** on wall in mezzanine kitchen area
2. **Connect Raspberry Pi** to TV via HDMI
3. **Connect power** to both TV and Pi
4. **Connect network** (Ethernet recommended for reliability)
5. **Power on** and proceed to software installation

---

## 2. Software Installation

### Install Raspberry Pi OS

1. Download **Raspberry Pi Imager**: https://www.raspberrypi.com/software/
2. Flash **Raspberry Pi OS Lite (64-bit)** to SD card
3. Enable SSH before first boot (create empty `ssh` file in boot partition)
4. Insert SD card and boot Pi

### Initial System Configuration

```bash
# SSH into the Pi (find IP via router or use raspberrypi.local)
ssh pi@raspberrypi.local
# Default password: raspberry

# Update system
sudo apt update && sudo apt upgrade -y

# Change default password
passwd

# Configure system
sudo raspi-config
# - Set hostname to "lmrc-noticeboard"
# - Set timezone to Australia/Sydney
# - Enable auto-login (Console Autologin)
# - Expand filesystem
# - Reboot
```

### Install Required Software

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should be v20.x.x
npm --version

# Install Chromium browser
sudo apt install -y chromium-browser

# Install dependencies for Puppeteer
sudo apt install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libgbm1 \
  libasound2

# Install git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2
```

---

## 3. Application Setup

### Clone or Copy Application

#### Option A: From Git Repository (if you have one)

```bash
cd /home/pi
git clone https://github.com/your-org/lmrc-noticeboard.git
cd lmrc-noticeboard
```

#### Option B: Manual Copy

```bash
# Create directory
mkdir -p /home/pi/lmrc-noticeboard
cd /home/pi/lmrc-noticeboard

# Copy all files from development machine via SCP
# From your development machine:
scp -r /path/to/project/* pi@raspberrypi.local:/home/pi/lmrc-noticeboard/
```

### Install Dependencies

```bash
cd /home/pi/lmrc-noticeboard

# Install Node.js dependencies
npm install

# Note: Puppeteer will download Chromium automatically
# This may take 5-10 minutes
```

### Configure Environment

```bash
# Create .env file from example
cp .env.example .env

# Edit with your credentials
nano .env
```

Edit the file:
```
REVSPORT_USERNAME=gevans11
REVSPORT_PASSWORD=Jk$Lv95EB@xU&7wq
PORT=3000
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter).

### Configure Settings

```bash
# Edit config.json with club details
nano config.json
```

Update the following sections:
- `branding.clubColors` - Your club colors
- `socialMedia` - Your Facebook/Instagram handles
- `sponsors` - Add your sponsor information
- `weather.bomStationId` - Set to appropriate BOM station

### Create Data Directory

```bash
# Create directory for scraped data
mkdir -p /home/pi/lmrc-noticeboard/data
```

### Build React Application

```bash
# Build the React frontend
npm run build

# This creates the production build in ./public/
```

### Test the Application

```bash
# Test scraper
npm run scrape

# Check that data files were created
ls -lh data/
# Should see: gallery-data.json, events-data.json, news-data.json

# Start server
npm start

# Open browser on another device and navigate to:
# http://raspberrypi.local:3000
# or
# http://<PI_IP_ADDRESS>:3000

# You should see the noticeboard!
```

---

## 4. Automated Scraping

### Create Scraper Cron Job

```bash
# Edit crontab
crontab -e

# Add this line to run scraper every hour at 5 minutes past
5 * * * * cd /home/pi/lmrc-noticeboard && /usr/bin/node scraper/noticeboard-scraper.js >> /home/pi/lmrc-noticeboard/scraper.log 2>&1

# Save and exit
```

### Test Cron Job

```bash
# View cron log
tail -f scraper.log

# Wait for the next hour to see it run, or manually trigger:
npm run scrape
```

---

## 5. Kiosk Mode Configuration

### Setup PM2 to Manage Server

```bash
# Start server with PM2
pm2 start server.js --name lmrc-noticeboard

# Set PM2 to start on boot
pm2 startup
# Follow the instructions it prints

# Save current PM2 processes
pm2 save

# Check status
pm2 status
```

### Configure Chromium Kiosk Mode

```bash
# Create autostart directory
mkdir -p /home/pi/.config/lxsession/LXDE-pi

# Create autostart file
nano /home/pi/.config/lxsession/LXDE-pi/autostart
```

Add these lines:

```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Disable screen blanking
@xset s off
@xset -dpms
@xset s noblank

# Start Chromium in kiosk mode after 10 second delay
@bash -c 'sleep 10 && chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen --disable-infobars --noerrdialogs --disable-session-crashed-bubble'
```

Save and exit.

### Configure Desktop Auto-Login

```bash
sudo raspi-config

# Navigate to:
# System Options -> Boot / Auto Login -> Desktop Autologin

# Finish and reboot
sudo reboot
```

After reboot, the noticeboard should automatically launch in fullscreen!

---

## 6. Troubleshooting

### Server Won't Start

```bash
# Check PM2 logs
pm2 logs lmrc-noticeboard

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart server
pm2 restart lmrc-noticeboard
```

### Scraper Fails

```bash
# Check scraper log
tail -100 scraper.log

# Run manually to see errors
npm run scrape

# Common issues:
# - RevSport credentials expired: Update .env file
# - Network issues: Check internet connection
# - Timeout: RevSport may be slow, wait and retry
```

### Browser Not Starting

```bash
# Check if Chromium is installed
chromium-browser --version

# Test browser manually
DISPLAY=:0 chromium-browser http://localhost:3000

# Check autostart file syntax
cat /home/pi/.config/lxsession/LXDE-pi/autostart
```

### Display Issues

```bash
# Check server is running
pm2 status

# Check API endpoints
curl http://localhost:3000/api/health

# Check React build exists
ls -lh public/

# Rebuild React app if needed
npm run build
```

### No Data Showing

```bash
# Check data files exist
ls -lh data/

# Check data file ages
stat data/*.json

# Manually run scraper
npm run scrape

# Check API returns data
curl http://localhost:3000/api/gallery | jq
```

---

## 7. Maintenance

### Regular Tasks

#### Weekly
- Check that display is working properly
- Verify content is updating

#### Monthly
- Check disk space: `df -h`
- Review scraper logs: `tail -100 scraper.log`
- Check PM2 status: `pm2 status`

#### As Needed
- Update RevSport credentials if changed
- Add/remove sponsors in config.json
- Update social media handles
- Adjust timing settings

### Updating Configuration

```bash
# SSH into Pi
ssh pi@raspberrypi.local

# Navigate to app directory
cd /home/pi/lmrc-noticeboard

# Pull latest changes (if using git)
git pull

# Or copy updated files via SCP from dev machine

# Reinstall dependencies if package.json changed
npm install

# Rebuild React app
npm run build

# Restart server
pm2 restart lmrc-noticeboard

# Verify it's working
curl http://localhost:3000/api/health
```

### Viewing Logs

```bash
# Server logs
pm2 logs lmrc-noticeboard

# Scraper logs
tail -f /home/pi/lmrc-noticeboard/scraper.log

# System logs
journalctl -u pm2-pi
```

### Restarting Services

```bash
# Restart server
pm2 restart lmrc-noticeboard

# Restart browser (need to be on Pi desktop)
pkill chromium

# Full system reboot
sudo reboot
```

### Backup Configuration

```bash
# Backup important files
cd /home/pi
tar -czf lmrc-backup-$(date +%Y%m%d).tar.gz \
  lmrc-noticeboard/config.json \
  lmrc-noticeboard/.env \
  lmrc-noticeboard/data/

# Copy backup to another location
scp lmrc-backup-*.tar.gz user@backup-server:/backups/
```

### Remote Management

```bash
# Enable VNC for remote desktop access (optional)
sudo raspi-config
# Navigate to: Interface Options -> VNC -> Enable

# Install RealVNC Viewer on your computer
# Connect to: raspberrypi.local or <PI_IP>

# This allows you to see the display remotely
```

---

## Emergency Recovery

### If Display Goes Blank

1. Check TV is on and input is correct
2. Check Pi is powered on (green LED should be on)
3. SSH into Pi and check server: `pm2 status`
4. Check browser process: `ps aux | grep chromium`
5. Reboot if needed: `sudo reboot`

### If Scraper Stops Working

1. Check internet connection: `ping google.com`
2. Check RevSport is accessible: `curl -I https://www.lakemacquarierowingclub.org.au`
3. Run scraper manually: `npm run scrape`
4. Check credentials in `.env` are still valid
5. Review error logs in `scraper.log`

### If Server Won't Start

1. Check port not in use: `sudo lsof -i :3000`
2. Kill conflicting process if needed
3. Check Node.js is working: `node --version`
4. Try starting manually: `npm start`
5. Check PM2 logs: `pm2 logs lmrc-noticeboard --lines 100`

### Nuclear Option - Full Reset

```bash
# Stop all services
pm2 stop all
pm2 delete all

# Remove application
rm -rf /home/pi/lmrc-noticeboard

# Re-deploy from scratch (see Section 3)
```

---

## Performance Optimization

### Reduce Memory Usage

```bash
# Edit config.json
nano /home/pi/lmrc-noticeboard/config.json

# Reduce these values:
"gallery.maxPhotosPerAlbum": 10,  # Instead of 20
"news.maxItemsToDisplay": 5,      # Instead of 7
```

### Improve Browser Performance

```bash
# Edit autostart to add performance flags
nano /home/pi/.config/lxsession/LXDE-pi/autostart

# Update Chromium line to:
@bash -c 'sleep 10 && chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen --disable-infobars --noerrdialogs --disable-session-crashed-bubble --disable-gpu --disable-software-rasterizer'
```

### Reduce Scraper Frequency

```bash
# Edit crontab
crontab -e

# Change to run every 2 hours instead of 1
5 */2 * * * cd /home/pi/lmrc-noticeboard && /usr/bin/node scraper/noticeboard-scraper.js >> /home/pi/lmrc-noticeboard/scraper.log 2>&1
```

---

## Security Considerations

### Secure SSH Access

```bash
# Change default password (if not already done)
passwd

# Disable password authentication (use SSH keys only)
sudo nano /etc/ssh/sshd_config
# Set: PasswordAuthentication no
sudo systemctl restart ssh
```

### Firewall Setup

```bash
# Install UFW
sudo apt install -y ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP (for noticeboard)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Keep System Updated

```bash
# Create update script
nano /home/pi/update-system.sh
```

Add:
```bash
#!/bin/bash
sudo apt update
sudo apt upgrade -y
sudo apt autoremove -y
npm update -g
```

Make executable and run monthly:
```bash
chmod +x /home/pi/update-system.sh
./update-system.sh
```

---

## Monitoring & Alerts

### Email Alerts on Failure

Install and configure `ssmtp` for email notifications when scraper fails:

```bash
# Install ssmtp
sudo apt install -y ssmtp

# Configure (example for Gmail)
sudo nano /etc/ssmtp/ssmtp.conf
```

Add:
```
root=your-email@gmail.com
mailhub=smtp.gmail.com:587
AuthUser=your-email@gmail.com
AuthPass=your-app-password
UseSTARTTLS=YES
```

Create alert script:
```bash
nano /home/pi/lmrc-noticeboard/scripts/alert-on-failure.sh
```

Add:
```bash
#!/bin/bash
if [ ! -f /home/pi/lmrc-noticeboard/data/gallery-data.json ]; then
  echo "LMRC Noticeboard: Scraper failure detected" | mail -s "Noticeboard Alert" committee@lmrc.org.au
fi
```

Add to crontab to check daily:
```bash
crontab -e

# Add:
0 9 * * * /home/pi/lmrc-noticeboard/scripts/alert-on-failure.sh
```

---

## Appendix A: File Structure

```
lmrc-noticeboard/
├── server.js                    # Express API server
├── package.json                 # Dependencies
├── config.json                  # Configuration
├── .env                         # Credentials (not in git)
├── .env.example                 # Template for .env
├── scraper/
│   └── noticeboard-scraper.js  # Data scraper
├── src/
│   └── Noticeboard.jsx         # React app source
├── public/                      # Built React app (after npm run build)
│   ├── index.html
│   └── assets/
├── data/                        # Scraped data (generated)
│   ├── gallery-data.json
│   ├── events-data.json
│   └── news-data.json
├── scripts/
│   ├── setup.js                # Setup helper
│   └── test-scraper.js         # Test scraper
├── assets/                      # Static assets
│   ├── logo.png
│   ├── sponsors/
│   └── fallback/
└── scraper.log                  # Scraper log file
```

---

## Appendix B: Quick Reference Commands

```bash
# Start server
pm2 start server.js --name lmrc-noticeboard

# Stop server
pm2 stop lmrc-noticeboard

# Restart server
pm2 restart lmrc-noticeboard

# View logs
pm2 logs lmrc-noticeboard

# Check status
pm2 status

# Run scraper manually
npm run scrape

# View scraper log
tail -f scraper.log

# Edit config
nano config.json

# Edit credentials
nano .env

# Rebuild React app
npm run build

# Reboot system
sudo reboot

# Check disk space
df -h

# Check memory usage
free -h

# Check process list
pm2 list

# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/gallery
curl http://localhost:3000/api/events
curl http://localhost:3000/api/news
```

---

## Appendix C: Common Configuration Changes

### Change Rotation Timing

Edit `config.json`:
```json
"timing": {
  "heroRotationSeconds": 20,        // Change from 15 to 20
  "newsPanelRotationSeconds": 60,   // Change from 45 to 60
  "sponsorRotationSeconds": 45      // Change from 30 to 45
}
```

### Add New Sponsor

Edit `config.json`:
```json
"sponsors": [
  {
    "name": "New Sponsor Name",
    "logoPath": "/assets/sponsors/new-sponsor.png",
    "url": "https://newsponsor.com"
  }
]
```

Upload logo:
```bash
scp sponsor-logo.png pi@raspberrypi.local:/home/pi/lmrc-noticeboard/public/assets/sponsors/new-sponsor.png
```

### Update Social Media Handles

Edit `config.json`:
```json
"socialMedia": {
  "facebook": {
    "enabled": true,
    "handle": "@NewHandle",
    "url": "https://facebook.com/newhandle"
  }
}
```

### Change Club Colors

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

---

## Support

### Getting Help

1. **Check logs first**: `pm2 logs` and `tail -f scraper.log`
2. **Review this guide**: Most issues covered in Troubleshooting
3. **Contact committee**: If technical issue persists
4. **Document issues**: Note error messages for debugging

### Useful Resources

- Raspberry Pi Documentation: https://www.raspberrypi.com/documentation/
- PM2 Documentation: https://pm2.keymetrics.io/docs/usage/quick-start/
- Node.js Documentation: https://nodejs.org/docs/
- Bureau of Meteorology: http://www.bom.gov.au/

---

**End of Deployment Guide**raspberrypi.local

# Edit config
cd /home/pi/lmrc-noticeboard
nano config.json

# Save changes
# The app will automatically reload within 60 seconds
```

### Updating Application Code

```bash
# SSH into Pi
ssh pi@