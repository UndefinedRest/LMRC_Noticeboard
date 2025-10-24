# LMRC Digital Noticeboard - Deployment Guide

**Choose your path:**
- 🚀 **Developer Testing** → [Quick Test (5 minutes)](#quick-test-5-minutes) - Test on your laptop first
- ⚡ **Experienced Users** → [Express Setup (30 minutes)](#express-setup-30-minutes) - Fast Pi deployment with install script
- 📖 **First-time Pi Users** → [Complete Guide](#complete-guide-2-3-hours) - Detailed step-by-step instructions

---

## Table of Contents

**Getting Started**
1. [Quick Test (5 minutes)](#quick-test-5-minutes) - Test on laptop
2. [Express Setup (30 minutes)](#express-setup-30-minutes) - Fast Pi deployment
3. [Complete Guide (2-3 hours)](#complete-guide-2-3-hours) - Detailed Pi deployment

**Reference**
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Quick Reference](#quick-reference)
- [Installation Checklist](#installation-checklist)

---

## Quick Test (5 minutes)

**Test the noticeboard on your laptop before deploying to Raspberry Pi**

### Prerequisites

```bash
# Install Node.js 20.x or later from https://nodejs.org/
node --version  # Should be 20.x or higher (22.x recommended)
```

### Setup

```bash
# 1. Get the code
cd lmrc-noticeboard

# 2. Install dependencies (2-5 minutes)
npm install

# 3. Test scraper
npm run scrape

# Check if data was collected
ls -lh data/
# You should see: gallery-data.json, events-data.json, news-data.json, sponsors-data.json

# 4. Build & run
npm run build
npm start

# 5. Open browser
# http://localhost:3000
```

**✅ If you see the noticeboard, you're ready to deploy to Raspberry Pi!**

Continue to [Express Setup](#express-setup-30-minutes) or [Complete Guide](#complete-guide-2-3-hours).

---

## Express Setup (30 minutes)

**Fast deployment for users comfortable with Raspberry Pi and Linux**

### What You Need

**Hardware:**
- Raspberry Pi 5 (8GB) or Pi 4 (4GB minimum)
- 64GB microSD card (high-endurance)
- 50" TV with HDMI
- Keyboard + mouse (setup only)
- Internet connection

### Step 1: Prepare Raspberry Pi (10 min)

1. **Flash SD Card** with Raspberry Pi Imager
   - OS: "Raspberry Pi OS (64-bit)" with desktop
   - Hostname: `lmrc-noticeboard`
   - Enable SSH
   - Set username/password
   - Configure WiFi (if needed)

2. **Boot and Update**
   ```bash
   ssh pi@lmrc-noticeboard.local
   sudo apt update && sudo apt upgrade -y
   ```

### Step 2: Install Software (10 min)

```bash
# Clone repository
cd ~
git clone <your-repo-url> lmrc-noticeboard
cd lmrc-noticeboard

# Run automated install script
chmod +x install.sh
./install.sh

# Follow prompts - it will:
# - Install Node.js, Chromium, emoji fonts, PM2
# - Build the app
# - Configure autostart
# - Start the server with PM2
```

### Step 3: Configure Kiosk Mode (5 min)

**Check your desktop environment first:**
```bash
echo $DESKTOP_SESSION
```

- If **LXDE-pi-labwc** (new Pi OS) → Follow [Method B in Complete Guide](#method-b-for-new-raspberry-pi-os-lxde-pi-labwc-with-wayland)
- If **LXDE-pi** (old Pi OS) → Follow [Method A in Complete Guide](#method-a-for-old-raspberry-pi-os-lxde-pi-with-x11)

**Note:** The install script creates autostart for old Pi OS only. New Pi OS (Bookworm+) requires manual configuration.

Enable auto-login:
```bash
sudo raspi-config
# System Options → Boot / Auto Login → Desktop Autologin
```

### Step 4: Configure Automated Scraping (2 min)

**The scraper has a built-in scheduler - no cron setup needed!**

Configure via Web UI:
1. Open browser: `http://lmrc-noticeboard.local:3000/config`
2. Scroll to **"Scraper Controls"** section
3. Set schedule (default: every 4 hours)
4. Click "Run Scraper Now" to test

### Step 5: Add Assets (3 min)

```bash
# From your computer, copy assets via SCP:
scp logo.png pi@lmrc-noticeboard.local:/home/pi/lmrc-noticeboard/public/assets/
scp sponsor*.png pi@lmrc-noticeboard.local:/home/pi/lmrc-noticeboard/public/assets/sponsors/
```

Update config via web UI: `http://lmrc-noticeboard.local:3000/config`

### Final Step: Reboot

```bash
sudo reboot
```

**✅ Done!** The noticeboard will appear automatically on your TV.

---

## Complete Guide (2-3 hours)

**Detailed step-by-step guide for first-time Raspberry Pi users**

No prior Linux or Raspberry Pi experience required!

### What You'll Need

#### Hardware Shopping List

1. **Raspberry Pi** - Choose one:
   - Raspberry Pi 5 (8GB) - **Recommended**, best performance (~$120 AUD)
   - Raspberry Pi 4 (4GB minimum) - Good alternative (~$90 AUD)

2. **MicroSD Card**
   - 32GB minimum (64GB recommended) (~$15-25 AUD)
   - Class 10 or UHS-I speed rating
   - High-endurance cards recommended for 24/7 operation
   - Brands: SanDisk, Samsung, Kingston

3. **Power Supply**
   - Official Raspberry Pi power supply (~$15 AUD)
   - Pi 4: 5V 3A USB-C
   - Pi 5: 5V 5A USB-C
   - **DON'T use phone chargers!** (causes instability)

4. **HDMI Cable**
   - **Micro HDMI to HDMI** cable for Pi 4/5 (~$10 AUD)
   - Regular HDMI cable won't fit!

5. **TV/Display**
   - Any TV with HDMI input
   - 50" recommended for visibility

6. **Temporary (for setup only)**
   - USB keyboard
   - USB mouse
   - MicroSD card reader (for your computer)

7. **Network Connection** - Choose one:
   - Ethernet cable (recommended - more reliable)
   - WiFi (built-in on Pi 4/5)

**Estimated Total Cost:** $200-300 AUD

Optional but recommended:
- Case with cooling fan (~$15 AUD)
- Heatsinks (if not using case with fan)

---

### Part 1: Setting Up Raspberry Pi

#### Step 1: Install Operating System (20 minutes)

**On Your Windows/Mac Computer:**

1. **Download Raspberry Pi Imager**
   - Visit: https://www.raspberrypi.com/software/
   - Click "Download for Windows" (or Mac)
   - Install like any normal program

2. **Insert MicroSD Card**
   - Use card reader to connect microSD to computer
   - If Windows asks to format, click "Cancel"

3. **Open Raspberry Pi Imager**

4. **Choose Device**
   - Click "CHOOSE DEVICE"
   - Select your Pi model (Pi 5 or Pi 4)

5. **Choose Operating System**
   - Click "CHOOSE OS"
   - Select **"Raspberry Pi OS (64-bit)"**
   - This is the first option with the full desktop
   - **NOT** the "Lite" version!

6. **Choose Storage**
   - Click "CHOOSE STORAGE"
   - Select your microSD card
   - **WARNING:** Everything on the card will be erased!

7. **Configure Settings** (IMPORTANT!)
   - Click the gear icon ⚙️ (bottom right)
   - OR click "NEXT" and it will prompt you

   **Fill in these settings:**

   **General Tab:**
   - ✅ Set hostname: `lmrc-noticeboard`
   - ✅ Set username and password
     - Username: `pi` (recommended)
     - Password: Choose a secure password (write it down!)
   - ✅ Configure wireless LAN (if using WiFi)
     - WiFi name (SSID)
     - WiFi password
     - Country: AU
   - ✅ Set locale settings
     - Timezone: Australia/Sydney (or your timezone)
     - Keyboard layout: us (or your layout)

   **Services Tab:**
   - ✅ Enable SSH
   - Select "Use password authentication"

8. **Write to SD Card**
   - Click "SAVE"
   - Click "YES" to apply settings
   - Click "YES" to confirm erase
   - Wait 5-10 minutes
   - Click "CONTINUE" when done

9. **Insert SD Card in Pi**
   - Remove card from computer
   - Insert into Pi (card slot on bottom)

---

#### Step 2: First Boot (5 minutes)

1. **Connect Everything**
   - HDMI cable: Pi → TV
   - Keyboard + Mouse: USB ports on Pi
   - Ethernet cable (if not using WiFi)
   - **Last:** Power supply → Pi

2. **Power On**
   - Pi will boot automatically when powered
   - Red LED = power
   - Green LED = activity

3. **Watch the Screen**
   - You'll see lots of text scrolling (normal!)
   - Desktop will appear after 1-2 minutes
   - Should auto-login to desktop

4. **Check Connection**
   - Look for WiFi/Ethernet icon in top-right
   - Should show connected

**Note Your IP Address:**
```bash
# Open Terminal (black icon in top toolbar)
hostname -I
# Write down the first number (e.g., 192.168.1.100)
```

---

#### Step 3: Update System (20 minutes)

**Important:** Always update before installing software.

```bash
# In the Terminal:
sudo apt update
sudo apt upgrade -y

# This will take 10-20 minutes on first boot
# You'll see a progress bar

# If prompted about configuration files, choose "keep current version"
```

When finished:
```bash
# Reboot to apply updates
sudo reboot
```

Pi will restart. Wait for desktop to appear again.

---

### Part 2: Installing Software

#### Install Node.js (5 minutes)

```bash
# Open Terminal

# Install prerequisites
sudo apt-get install -y ca-certificates curl gnupg

# Create keyring directory
sudo mkdir -p /etc/apt/keyrings

# Download NodeSource GPG key
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

# Add NodeSource repository for Node.js 20.x or 22.x
NODE_MAJOR=22  # Use 22 for latest LTS, or 20 for older LTS
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

# Install Node.js
sudo apt-get update
sudo apt-get install -y nodejs

# Verify installation
node --version
# Should show: v20.x.x or v22.x.x

npm --version
# Should show: 10.x.x
```

**Note:** This uses the official NodeSource repository method (the old `setup_X.x` scripts are deprecated).
Node.js 22.x (current LTS) is recommended, but 20.x will also work fine.

---

#### Install Browser (for Display Only) (5 minutes)

Chromium is needed for kiosk mode (fullscreen display).

```bash
sudo apt install -y chromium-browser

# Verify
chromium-browser --version
```

**Note:** The scraper doesn't need a browser - it uses lightweight HTML parsing.

---

#### Install Emoji Font Support (2 minutes)

The configuration web interface uses emoji icons. Install emoji font support:

```bash
# Install emoji font
sudo apt-get install -y fonts-noto-color-emoji

# Refresh font cache
fc-cache -f -v
```

**What this fixes:** Without emoji fonts, the config page at `http://localhost:3000/config` will show empty squares instead of icons (📊, 🎨, ⏱️, 📰, 🌤️, 📱).

**Note:** You'll see the emoji icons properly after rebooting the Pi.

---

#### Install Git (1 minute)

```bash
sudo apt install -y git

# Verify
git --version
```

---

#### Install PM2 (2 minutes)

PM2 manages the server process and ensures it restarts on boot.

```bash
# Install globally
sudo npm install -g pm2

# Verify
pm2 --version
```

---

### Part 3: Installing the Noticeboard

#### Download the Application (5 minutes)

**Option A: Clone from Git**

```bash
cd ~
git clone <your-repo-url> lmrc-noticeboard
cd lmrc-noticeboard
```

**Option B: Copy Files from USB**

```bash
# Insert USB drive, then:
cd ~
cp -r /media/pi/USB_NAME/lmrc-noticeboard .
cd lmrc-noticeboard
```

**Option C: Download from Computer via SCP**

```bash
# On your computer (not Pi):
scp -r lmrc-noticeboard pi@lmrc-noticeboard.local:/home/pi/
```

---

#### Install Dependencies (10 minutes)

```bash
cd ~/lmrc-noticeboard
npm install

# This will take 5-10 minutes
# You'll see progress bars
```

**Common errors:**
- "EACCES permission denied" → Run `sudo npm install` instead
- "Network timeout" → Check internet connection

---

#### Build the Website (3 minutes)

```bash
npm run build

# Should see:
# ✓ built in XXXms
# Creates files in public/ directory
```

---

#### Test the Scraper (2-5 minutes)

```bash
npm run scrape
```

**You should see:**
```
═══════════════════════════════════════════════
  LMRC NOTICEBOARD SCRAPER (Lightweight)
═══════════════════════════════════════════════

[Gallery] Scraping gallery...
[Gallery] Found X albums
[Gallery] Captured XXX total photos

[Events] Scraping events...
[Events] Found X upcoming events

[News] Scraping news...
[News] Found X news items

[Sponsors] Scraping sponsors...
[Sponsors] Found X sponsors

✓ All scraping completed successfully!
```

**Verify data files created:**
```bash
ls -lh data/
# Should show 4 files:
# gallery-data.json
# events-data.json
# news-data.json
# sponsors-data.json
```

**If scraper fails:**
- Check internet connection
- Verify RevSport website is accessible: `curl https://www.lakemacquarierowingclub.org.au/`

---

#### Configure Environment Variables (Optional - 1 minute)

If you want to use OpenWeatherMap for weather data:

```bash
# Create .env file
nano .env
```

**Add your OpenWeatherMap API key:**
```bash
# Weather API (OpenWeatherMap) - Optional
# Get your free API key at: https://openweathermap.org/api
OPENWEATHERMAP_API_KEY=your_api_key_here
```

**Save and exit:** Ctrl+X, Y, Enter

**Note:** This is optional. Weather will still work using BOM data from `config.json` without an API key.

---

#### Test the Server (2 minutes)

```bash
npm start
```

**You should see:**
```
[Scheduler] Running scraper on startup...
[Scheduler] Started with schedule: 0 */4 * * *

Server running on http://localhost:3000
```

**Test in browser:**
1. Open Chromium on Pi
2. Go to: `http://localhost:3000`
3. You should see the noticeboard!

**Test config page:**
1. Go to: `http://localhost:3000/config`
2. You should see configuration interface

**Stop the server:**
- Press `Ctrl+C` in Terminal

---

### Part 4: Automatic Startup

#### Start Server with PM2 (2 minutes)

PM2 will keep the server running and restart it if it crashes.

```bash
cd ~/lmrc-noticeboard

# Start server with PM2
pm2 start server.js --name lmrc-noticeboard

# Check status
pm2 status
# Should show: lmrc-noticeboard | online

# View logs
pm2 logs lmrc-noticeboard --lines 20
```

**PM2 Commands:**
```bash
pm2 status              # Check if running
pm2 restart lmrc-noticeboard  # Restart
pm2 stop lmrc-noticeboard     # Stop
pm2 logs lmrc-noticeboard     # View logs
```

---

#### Make PM2 Start on Boot (2 minutes)

```bash
# Run this command
pm2 startup

# It will print a command like:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u pi --hp /home/pi

# COPY and RUN that exact command it printed
# (Paste it into terminal and press Enter)

# Save the current PM2 process list
pm2 save
```

Now PM2 will auto-start your server on every reboot!

---

#### Configure Automated Scraping (2 minutes)

**The scraper has a built-in scheduler - no manual cron setup needed!**

**Configure via Web UI:**
1. Open browser: `http://localhost:3000/config`
2. Scroll to **"Scraper Controls"** section
3. Configure settings:
   - **Enable Automatic Scraping:** ✅ (checked)
   - **Schedule:** Select from dropdown (default: Every 4 hours)
   - **Run on Startup:** ✅ (checked)
4. Click "Save Changes"
5. Click "Run Scraper Now" to test

**Schedule Options:**
- Every hour: `0 * * * *`
- Every 2 hours: `0 */2 * * *`
- Every 4 hours: `0 */4 * * *` (recommended)
- Every 6 hours: `0 */6 * * *`
- Once daily at 6am: `0 6 * * *`

**Monitor scraper:**
```bash
# View last scraper run
curl http://localhost:3000/api/scraper/status

# View scraper logs
tail -f ~/lmrc-noticeboard/scraper.log
```

---

### Part 5: Kiosk Mode

Make Chromium open fullscreen automatically on boot.

**IMPORTANT:** The setup differs based on your Raspberry Pi OS version. First, check which desktop environment you're using:

```bash
echo $DESKTOP_SESSION
```

- **LXDE-pi** → Old Raspberry Pi OS (Bullseye or earlier) - Use Method A
- **LXDE-pi-labwc** → New Raspberry Pi OS (Bookworm or later) - Use Method B

---

#### Method A: For Old Raspberry Pi OS (LXDE-pi with X11)

**Step 1: Create autostart directory**

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
```

**Step 2: Create autostart file**

```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```

**Paste this:**

```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Disable screen blanking
@xset s off
@xset -dpms
@xset s noblank

# Start Chromium in kiosk mode
@bash -c 'sleep 10 && chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen --disable-infobars --noerrdialogs --disable-session-crashed-bubble --disable-gpu'
```

**Save:** Ctrl+X, Y, Enter

**Skip to "Enable Auto-Login" section below**

---

#### Method B: For New Raspberry Pi OS (LXDE-pi-labwc with Wayland)

**Step 1: Remove old autostart (if it exists)**

```bash
rm -f ~/.config/lxsession/LXDE-pi/autostart
```

**Step 2: Create XDG autostart directory**

```bash
mkdir -p ~/.config/autostart
```

**Step 3: Create desktop entry for kiosk**

```bash
nano ~/.config/autostart/noticeboard-kiosk.desktop
```

**Paste this:**

```ini
[Desktop Entry]
Type=Application
Name=Noticeboard Kiosk
Comment=Launch LMRC Noticeboard in kiosk mode
Exec=sh -c 'sleep 15 && chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen --disable-infobars --noerrdialogs --disable-session-crashed-bubble'
X-GNOME-Autostart-enabled=true
```

**Save:** Ctrl+X, Y, Enter

**Step 4: Disable screen blanking for labwc**

```bash
mkdir -p ~/.config/labwc
nano ~/.config/labwc/autostart
```

**Paste this:**

```bash
# Disable screen blanking
wlr-randr --output HDMI-A-1 --off
wlr-randr --output HDMI-A-1 --on

# Keep screen awake (requires swayidle)
swayidle -w timeout 0 '' &
```

**Save:** Ctrl+X, Y, Enter

**Step 5: Install swayidle**

```bash
sudo apt-get install -y swayidle
```

**Why the difference?**
- Newer Pi OS uses **Wayland** (labwc compositor) instead of X11
- Wayland doesn't support `~/.config/lxsession/` autostart
- Must use XDG autostart (`.desktop` files) instead
- Screen blanking is controlled differently (wlr-randr instead of xset)

---

#### Hide Mouse Cursor - Optional (2 minutes)

**For X11 (Old Pi OS - Method A):**

```bash
sudo apt install -y unclutter

# Edit autostart again
nano ~/.config/lxsession/LXDE-pi/autostart

# Add this line at the end:
@unclutter -idle 0.1 -root
```

**For Wayland (New Pi OS - Method B):**

Mouse cursor hiding on Wayland is more complex. Most users won't see the cursor in kiosk mode anyway. If needed:

```bash
# Install seat management tool
sudo apt-get install -y seatd

# Cursor will automatically hide when not moving in kiosk mode
```

---

#### TV/Display Settings (2 minutes)

**Also check TV settings:**
- Disable "Auto Power Off"
- Disable "Sleep Timer"
- Disable "Eco Mode"
- Set "HDMI CEC" to keep TV awake

**For stubborn screens (both X11 and Wayland):**

```bash
# Edit config.txt
sudo nano /boot/firmware/config.txt

# Add at the end:
hdmi_blanking=1
hdmi_force_hotplug=1

# Save and reboot
sudo reboot
```

**Note:** Screen blanking is already disabled in the autostart configurations above:
- **Method A (X11):** Uses `xset` commands
- **Method B (Wayland):** Uses `labwc/autostart` with `wlr-randr` and `swayidle`

---

#### Enable Auto-Login (2 minutes)

Make Pi boot directly to desktop (no login screen).

```bash
sudo raspi-config
```

Navigate:
1. **System Options** → Enter
2. **Boot / Auto Login** → Enter
3. **Desktop Autologin** → Enter
4. **Finish** → Enter

---

#### Test Everything! (5 minutes)

```bash
sudo reboot
```

**Watch the Pi boot:**

1. **Boot sequence** (~30 seconds)
2. **Desktop appears** (~10 seconds)
3. **Chromium starts** (after 10 second delay)
4. **Noticeboard displays fullscreen!**

**What you should see:**
- ✅ Fullscreen noticeboard (no browser chrome)
- ✅ Header with logo, date/time, weather
- ✅ Three panels: Events, Photos, News
- ✅ Footer with sponsors
- ✅ No mouse cursor (if unclutter installed)

**If something's wrong, see [Troubleshooting](#troubleshooting).**

---

## Troubleshooting

### Problem: Noticeboard doesn't appear after reboot

**Check if server is running:**
```bash
pm2 status
# Should show: lmrc-noticeboard | online
```

**If offline, check logs:**
```bash
pm2 logs lmrc-noticeboard --lines 50
```

**Common causes:**
- Port 3000 already in use → `sudo lsof -i :3000` (kill the process)
- Server crashed → `pm2 restart lmrc-noticeboard`
- PM2 not starting on boot → Re-run `pm2 startup` and `pm2 save`

**Check autostart:**
```bash
cat ~/.config/lxsession/LXDE-pi/autostart
# Should have the Chromium kiosk command
```

**Chromium taking too long to start:**
```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```
Change `sleep 10` to `sleep 30`

---

### Problem: No data showing (blank panels)

**Check scraper status via Web UI:**
1. SSH into Pi: `ssh pi@lmrc-noticeboard.local`
2. Open browser: `http://localhost:3000/config`
3. Check "Scraper Controls" section
4. Look for error messages in Last Run status

**Or manually trigger scraper:**
```bash
cd ~/lmrc-noticeboard
npm run scrape
```

**Common issues:**
- No internet connection → Check WiFi/Ethernet
- RevSport website temporarily down → Wait and retry
- Scraper disabled in config → Check Enable toggle in web UI

**Check data files:**
```bash
ls -lh ~/lmrc-noticeboard/data/
# Files should be recent (within last few hours)
```

---

### Problem: Screen goes black after some time

**TV is going to sleep:**

1. Check TV settings:
   - Disable "Auto Power Off"
   - Disable "Sleep Timer"
   - Disable "Eco Mode"

2. Check HDMI CEC settings:
   ```bash
   sudo nano /boot/firmware/config.txt
   # Add:
   hdmi_force_hotplug=1
   ```

3. Install screen keeper:
   ```bash
   sudo apt install -y xdotool
   nano ~/.config/lxsession/LXDE-pi/autostart
   # Add at end:
   @bash -c 'while true; do xdotool mousemove 0 0; sleep 300; done'
   ```

---

### Problem: Chromium doesn't start in kiosk mode after reboot

**First, check which desktop environment you're using:**

```bash
echo $DESKTOP_SESSION
```

**For LXDE-pi (Old Pi OS with X11):**

Check if autostart file exists:
```bash
cat ~/.config/lxsession/LXDE-pi/autostart
```

If missing, follow [Method A in Part 5](#method-a-for-old-raspberry-pi-os-lxde-pi-with-x11).

**For LXDE-pi-labwc (New Pi OS with Wayland):**

Check if desktop entry exists:
```bash
cat ~/.config/autostart/noticeboard-kiosk.desktop
```

If missing, follow [Method B in Part 5](#method-b-for-new-raspberry-pi-os-lxde-pi-labwc-with-wayland).

**Common issues:**
- Server not running: `pm2 status` (should show "online")
- Wrong desktop method used: Check `$DESKTOP_SESSION` and use correct method
- Chromium path wrong: Try `which chromium-browser`

**Test Chromium manually:**
```bash
chromium-browser --kiosk --app=http://localhost:3000
# Should open fullscreen
# Press Alt+F4 to close
```

**If manual test works but autostart doesn't:**
- Increase sleep time in autostart config (try 20 or 30 seconds)
- Check PM2 is set to start on boot: `pm2 list`

---

### Problem: Config page icons showing as empty squares

**Symptom:** When you open `http://localhost:3000/config`, the navigation icons appear as empty squares (��) instead of emojis.

**Solution:**
```bash
# Install emoji font support
sudo apt-get update
sudo apt-get install -y fonts-noto-color-emoji

# Refresh font cache
fc-cache -f -v

# Reboot to apply changes
sudo reboot
```

**What's happening:** Raspberry Pi OS doesn't include emoji fonts by default. The config interface uses emoji icons (📊, 🎨, ⏱️, 📰, 🌤️, 📱) which require the `fonts-noto-color-emoji` package.

---

### Problem: Weather not showing

**Update BOM station ID:**
1. Go to: `http://localhost:3000/config`
2. Find your nearest BOM station: http://www.bom.gov.au/places/
3. Update "BOM Station ID" in Weather section
4. Save changes

---

### Problem: Old data (content not updating)

**Check scheduler status:**
```bash
curl http://localhost:3000/api/scraper/status
```

**Check if scraper is enabled:**
1. Open: `http://localhost:3000/config`
2. Check "Enable Automatic Scraping" is checked
3. Check schedule is set correctly

**View scraper logs:**
```bash
tail -50 ~/lmrc-noticeboard/scraper.log
```

**Manually trigger scraper:**
```bash
curl -X POST http://localhost:3000/api/scraper/trigger
```

---

### Problem: Server crashes or restarts frequently

**View error logs:**
```bash
pm2 logs lmrc-noticeboard --lines 100
```

**Common causes:**
- Low memory → Add swap space
- Overheating → Add cooling fan/heatsinks
- Corrupted SD card → Replace card

**Add swap space:**
```bash
sudo dphys-swapfile swapoff
sudo nano /etc/dphys-swapfile
# Change CONF_SWAPSIZE=100 to CONF_SWAPSIZE=1024
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

**Check temperature:**
```bash
vcgencmd measure_temp
# Should be < 70°C under load
```

---

## Maintenance

### Weekly: Visual Check

Just look at the TV:
- ✅ Is noticeboard displaying?
- ✅ Is content recent (check dates)?
- ✅ Are photos rotating?
- ✅ Is time/weather showing?

**If anything looks wrong, see [Troubleshooting](#troubleshooting).**

---

### Monthly: Check Logs

```bash
ssh pi@lmrc-noticeboard.local

# Check server health
pm2 status
pm2 logs lmrc-noticeboard --lines 50

# Check scraper logs
tail -100 ~/lmrc-noticeboard/scraper.log

# Check disk space
df -h
# Should have > 2GB free on /

# Check memory
free -h
```

---

### Updating the Application

When there's a new version:

```bash
ssh pi@lmrc-noticeboard.local
cd ~/lmrc-noticeboard

# Backup current config
cp config.json config.json.backup

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart lmrc-noticeboard
```

---

### Changing Settings

**Use the Web Configuration Editor (Recommended):**
1. Open browser: `http://lmrc-noticeboard.local:3000/config`
2. Navigate to the relevant section (Timing, Branding, etc.)
3. Make your changes using the form controls
4. Click "Save Changes" (automatic backup created)
5. Changes apply within 60 seconds (no restart needed)

**Or edit manually (Advanced):**
```bash
ssh pi@lmrc-noticeboard.local
nano ~/lmrc-noticeboard/config.json

# Make changes, save, and exit
# Changes apply automatically within 60 seconds
```

**Common adjustments:**
- Rotation timing → `timing` section
- Club colors → `branding.clubColors`
- Sponsor logos → `sponsors` array
- Scraper schedule → `scraper.schedule`

---

### System Updates (Every 2-3 months)

Keep Raspberry Pi OS updated:

```bash
ssh pi@lmrc-noticeboard.local

sudo apt update
sudo apt upgrade -y

# If kernel was updated, reboot
sudo reboot
```

---

## Quick Reference

### Common Commands

```bash
# Server Management
pm2 status                          # Check server
pm2 restart lmrc-noticeboard       # Restart server
pm2 logs lmrc-noticeboard          # View logs

# Scraper Management
cd ~/lmrc-noticeboard && npm run scrape    # Run manually
curl http://localhost:3000/api/scraper/status    # Check scheduler status
curl -X POST http://localhost:3000/api/scraper/trigger    # Trigger scraper via API

# Configuration
# Use web UI: http://lmrc-noticeboard.local:3000/config
# Or edit manually:
cd ~/lmrc-noticeboard
nano config.json                   # Edit settings (advanced)

# System
sudo reboot                         # Restart Pi
sudo shutdown -h now               # Shutdown Pi
df -h                              # Disk space
free -h                            # Memory usage
vcgencmd measure_temp              # Temperature
```

---

### File Locations

```
/home/pi/lmrc-noticeboard/          Main folder
   config.json                      All settings
   server.js                        Server program
   server-scheduler.js              Scraper scheduler
   data/                            Scraped data
      gallery-data.json
      events-data.json
      news-data.json
      sponsors-data.json
   scraper.log                      Scraper log file
```

---

### Web Interfaces

```
http://lmrc-noticeboard.local:3000         # Main noticeboard display
http://lmrc-noticeboard.local:3000/config  # Configuration editor
http://lmrc-noticeboard.local:3000/api/health      # Server health check
http://lmrc-noticeboard.local:3000/api/scraper/status  # Scraper status
```

---

### Remote Access

From another computer on same network:

```bash
# SSH into the Pi
ssh pi@lmrc-noticeboard.local

# Or use IP address
ssh pi@192.168.1.XXX
```

Enter your password when asked.

**Enable VNC for graphical access:**
```bash
sudo raspi-config
# Interface Options → VNC → Enable
```

Then use VNC Viewer on your computer to connect to `lmrc-noticeboard.local`.

---

## Installation Checklist

Track your progress:

**Hardware:**
- [ ] Raspberry Pi purchased
- [ ] MicroSD card purchased
- [ ] Power supply purchased
- [ ] Micro HDMI cable purchased
- [ ] Raspberry Pi OS installed on SD card
- [ ] Pi boots and shows desktop

**Software:**
- [ ] System updated (`apt update` & `upgrade`)
- [ ] IP address noted down
- [ ] Node.js installed (v20.x or 22.x)
- [ ] Chromium installed
- [ ] Emoji fonts installed
- [ ] Git installed
- [ ] PM2 installed

**Application:**
- [ ] Repository cloned/copied
- [ ] npm install completed successfully
- [ ] .env file created (optional, for OpenWeatherMap API)
- [ ] Frontend built (`npm run build`)
- [ ] Scraper tested successfully
- [ ] Server tested in browser (localhost:3000)

**Production Setup:**
- [ ] PM2 started and shows "online"
- [ ] PM2 startup enabled
- [ ] PM2 saved
- [ ] Scraper scheduler configured via web UI
- [ ] Autostart file created
- [ ] Auto-login enabled
- [ ] Screen blanking disabled
- [ ] Mouse cursor hidden (optional)

**Final Tests:**
- [ ] Reboot test - noticeboard appears automatically
- [ ] Display never goes to sleep
- [ ] Content updates automatically
- [ ] Clock shows correct time
- [ ] Weather displays

---

## Verification Checklist

After deployment, verify everything works:

**Visual Check:**
- [ ] TV displays noticeboard in fullscreen
- [ ] Header shows club logo, date/time, weather
- [ ] Left panel shows upcoming events
- [ ] Center rotates through photos/news
- [ ] Right panel shows news items
- [ ] Footer shows sponsors and social media
- [ ] Content updates automatically

**System Check:**
```bash
# SSH into Pi
ssh pi@lmrc-noticeboard.local

# Check server is running
pm2 status
# Should show: lmrc-noticeboard | online

# Check data files exist and are recent
ls -lh /home/pi/lmrc-noticeboard/data/
# Should show files modified within configured schedule

# Check API is working
curl http://localhost:3000/api/health
# Should return: {"status":"healthy",...}

# Check scheduler status
curl http://localhost:3000/api/scraper/status
# Should show: {"enabled":true,"schedule":"0 */4 * * *",...}

# Check scraper log
tail -20 /home/pi/lmrc-noticeboard/scraper.log
# Should show successful scrapes
```

---

## Customization

### Required Setup

After installation, customize these via Web UI (`http://lmrc-noticeboard.local:3000/config`):

1. **Branding:**
   - Upload club logo (`public/assets/logo.png`)
   - Set club colors
   - Update club name and tagline

2. **Weather:**
   - Set correct BOM station ID for your location
   - Find at: http://www.bom.gov.au/places/

3. **Social Media:**
   - Add Facebook handle
   - Add Instagram handle

4. **Sponsors:**
   - Upload sponsor logos to `public/assets/sponsors/`
   - Add sponsor details in config

5. **Timing:**
   - Adjust rotation speeds (default: 15s/45s/30s)
   - Set scraper schedule (default: every 4 hours)

### Optional Customization

- Adjust max events/news displayed
- Change panel widths
- Enable/disable Ken Burns effect on photos
- Customize fallback messages
- Add custom CSS

---

## Success!

**Congratulations!** Your digital noticeboard is running.

**Your noticeboard is working when:**
- ✅ Displays automatically on boot
- ✅ Shows current date/time and weather
- ✅ Rotates through club photos
- ✅ Lists upcoming events
- ✅ Shows recent news and results
- ✅ Displays sponsor logos
- ✅ Updates content automatically (every 4 hours by default)
- ✅ Runs 24/7 without intervention

**Next Steps:**
- Test for 24 hours to ensure stability
- Train committee members on web-based configuration
- Setup email alerts for failures (optional)
- Schedule monthly maintenance checks
- Consider purchasing spare Pi as backup

**For Further Help:**
- See [CLAUDE.md](CLAUDE.md) for architecture details
- See [README.md](README.md) for feature overview
- Check `config.json` for all available options

**Enjoy your new digital noticeboard!** 🚣‍♂️
