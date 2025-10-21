# LMRC Digital Noticeboard - Raspberry Pi Deployment Guide

**Complete step-by-step guide for first-time Raspberry Pi users**

This guide walks you through deploying the LMRC Digital Noticeboard on a Raspberry Pi, from unboxing to having it running 24/7 on your TV. No prior Linux or Raspberry Pi experience required!

---

## Table of Contents

1. [What You'll Need](#what-youll-need)
2. [Part 1: Setting Up Raspberry Pi](#part-1-setting-up-raspberry-pi)
3. [Part 2: Installing Software](#part-2-installing-software)
4. [Part 3: Installing the Noticeboard](#part-3-installing-the-noticeboard)
5. [Part 4: Automatic Startup](#part-4-automatic-startup)
6. [Part 5: Kiosk Mode](#part-5-kiosk-mode)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)
9. [Quick Reference](#quick-reference)

---

## What You'll Need

### Hardware Shopping List

1. **Raspberry Pi** - Choose one:
   - Raspberry Pi 5 (8GB) - Recommended, best performance
   - Raspberry Pi 4 (4GB minimum) - Good alternative

2. **MicroSD Card**
   - 32GB minimum (64GB recommended)
   - Class 10 or UHS-I speed rating
   - Brands: SanDisk, Samsung, Kingston

3. **Power Supply**
   - Official Raspberry Pi power supply
   - Pi 4: 5V 3A USB-C
   - Pi 5: 5V 5A USB-C
   - DON'T use phone chargers!

4. **HDMI Cable**
   - **Micro HDMI to HDMI** cable for Pi 4/5
   - Regular HDMI cable won't fit!

5. **TV/Display**
   - Any TV with HDMI input

6. **Temporary (for setup only)**
   - USB keyboard
   - USB mouse
   - MicroSD card reader

7. **Network Connection** - Choose one:
   - Ethernet cable (recommended - more reliable)
   - WiFi (built-in on Pi 4/5)

**Estimated Total Cost:** $200-300 AUD

---

## Part 1: Setting Up Raspberry Pi

### Step 1: Install Operating System (20 minutes)

#### On Your Windows/Mac Computer:

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

6. **Choose Storage**
   - Click "CHOOSE STORAGE"
   - Select your microSD card
   - Everything on the card will be erased!

7. **Configure Settings** (IMPORTANT)
   - Click the gear icon ™ (bottom right)
   - OR click "NEXT" and it will prompt you

   **Fill in these settings:**

   **General Tab:**
   -  Set hostname: `lmrc-noticeboard`
   -  Set username and password:
     - Username: `pi`
     - Password: [choose something secure - write it down!]
   -  Configure wireless LAN (if using WiFi):
     - SSID: [your WiFi network name]
     - Password: [your WiFi password]
     - Country: `AU`
   -  Set locale settings:
     - Time zone: `Australia/Sydney`
     - Keyboard layout: `us`

   **Services Tab:**
   -  Enable SSH
   - Select "Use password authentication"

   Click **"SAVE"**

8. **Write to Card**
   - Click "NEXT"
   - Click "YES" to confirm
   - Wait 5-15 minutes (grab a coffee!)
   - When done: "Write Successful"
   - Safely eject the card

### Step 2: First Boot (5 minutes)

1. **Insert the microSD card** into Raspberry Pi
   - Card slot is on the bottom/side
   - Push gently until it clicks

2. **Connect Everything** (in this order):
   - HDMI cable from Pi to TV
   - USB keyboard to Pi
   - USB mouse to Pi
   - Ethernet cable (if using wired network)
   - **Power cable LAST** to Pi

3. **Power On**
   - Turn on TV and select HDMI input
   - Pi will boot automatically when powered
   - You'll see raspberry logo and scrolling text
   - First boot takes 1-2 minutes
   - Desktop will appear!

4. **Welcome Wizard** (if it appears)
   - Click through any setup wizard
   - Most settings already configured
   - Click "Skip" on update check (we'll do manually)
   - Reboot if asked

### Step 3: Update System (20 minutes)

1. **Open Terminal**
   - Click the black terminal icon at top of screen (looks like >_)
   - A black window opens - this is where you type commands

2. **Update Package List**
   ```bash
   sudo apt update
   ```
   - Type this exactly and press Enter
   - You'll see text scrolling - this is normal!
   - Wait for it to return to the prompt

3. **Upgrade All Software**
   ```bash
   sudo apt upgrade -y
   ```
   - This takes 10-30 minutes
   - You'll see progress bars
   - Goes through "Reading package lists", "Unpacking", "Setting up"
   - Done when you see the prompt again

4. **Find Your IP Address**
   ```bash
   hostname -I
   ```
   - **Write this number down!** (e.g., `192.168.1.100`)
   - You'll need it later for remote access

---

## Part 2: Installing Software

Stay in the Terminal window for all these steps.

### Install Node.js (5 minutes)

Node.js runs the noticeboard application.

```bash
# Download Node.js setup script
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify it worked
node --version
```

You should see: `v20.something.something`

If you see that version number, Node.js is installed correctly!

### Install Browser Dependencies (5 minutes)

```bash
# Install Chromium browser and codecs
sudo apt install -y chromium-browser chromium-codecs-ffmpeg-extra

# Install libraries needed by the scraper
sudo apt install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1 libasound2
```

### Install Git (1 minute)

```bash
sudo apt install -y git

# Check it worked
git --version
```

### Install PM2 (2 minutes)

PM2 keeps the server running 24/7.

```bash
sudo npm install -g pm2

# Check it worked
pm2 --version
```

Great! All required software is installed.

---

## Part 3: Installing the Noticeboard

### Download the Application (5 minutes)

```bash
# Go to your home folder
cd ~

# Download from GitHub
git clone https://github.com/UndefinedRest/LMRC_Noticeboard.git lmrc-noticeboard

# Enter the folder
cd lmrc-noticeboard

# Verify you're in the right place
pwd
```

Should show: `/home/pi/lmrc-noticeboard`

### Install Dependencies (10 minutes)

```bash
npm install
```

This downloads all the code libraries. Takes 5-10 minutes. You'll see lots of output - this is normal!

When done, you'll see: "added XXX packages"

### Configure Login Credentials (3 minutes)

1. **Copy the template file**
   ```bash
   cp .env.example .env
   ```

2. **Edit the file**
   ```bash
   nano .env
   ```

3. **A text editor opens**. Use arrow keys to move. Edit these lines:
   ```
   REVSPORT_USERNAME=your_username_here
   REVSPORT_PASSWORD=your_password_here
   PORT=3000
   NODE_ENV=production
   ```

   Replace `your_username_here` and `your_password_here` with your actual RevSport login details.

4. **Save and exit**:
   - Press `Ctrl+X`
   - Press `Y` (for "yes, save")
   - Press `Enter`

### Build the Website (3 minutes)

```bash
npm run build
```

You'll see lots of output ending with: "build complete"

### Test the Scraper (2-5 minutes)

```bash
npm run scrape
```

**What you should see:**
- "Authenticating with RevSport..."
- "Scraping gallery..."
- "Scraping events..."
- "Scraping news..."
- "Scraping sponsors..."
- "Scraping completed successfully!"

**If you see errors:**
- Check your username/password in `.env` (Step "Configure Login Credentials")
- Make sure you have internet connection

### Test the Server (2 minutes)

```bash
npm start
```

**You should see:**
```
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
  LMRC NOTICEBOARD SERVER
PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP
Server running on: http://localhost:3000
```

**Now test in browser:**
1. Open Chromium browser (globe icon at top)
2. Type in address bar: `http://localhost:3000`
3. Press Enter

You should see the noticeboard with events, photos, news, and sponsors!

**Stop the server:**
- Go back to Terminal
- Press `Ctrl+C`

---

## Part 4: Automatic Startup

### Start Server with PM2 (2 minutes)

```bash
# Make sure you're in the app folder
cd ~/lmrc-noticeboard

# Start with PM2
pm2 start server.js --name lmrc-noticeboard

# Check status
pm2 status
```

You should see a table showing "lmrc-noticeboard" with status "online" and green color.

### Make PM2 Start on Boot (2 minutes)

```bash
pm2 startup
```

This prints a long command starting with `sudo env PATH=...`

**Copy that entire command and run it** (paste with Ctrl+Shift+V).

Then save the PM2 configuration:
```bash
pm2 save
```

### Set Up Hourly Scraping (5 minutes)

This makes the scraper run every hour to get fresh data.

```bash
crontab -e
```

If asked "Select an editor", type `1` and press Enter (for nano).

A file opens. Use arrow keys to go to the very bottom, then add this line:

```
5 * * * * cd /home/pi/lmrc-noticeboard && /usr/bin/node scraper/noticeboard-scraper.js >> /home/pi/lmrc-noticeboard/scraper.log 2>&1
```

**What this means:** "At 5 minutes past every hour, run the scraper and save output to a log file"

Save and exit: `Ctrl+X`, `Y`, `Enter`

Verify:
```bash
crontab -l
```

You should see your line.

---

## Part 5: Kiosk Mode

This makes the browser open fullscreen automatically when the Pi boots.

### Create Autostart Folder (1 minute)

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
```

### Create Autostart File (5 minutes)

```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```

An empty file opens. Copy and paste this entire block (use Ctrl+Shift+V):

```bash
# Disable screen blanking
@xset s off
@xset -dpms
@xset s noblank

# Fix Chromium crash detection
@sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' ~/.config/chromium/Default/Preferences
@sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' ~/.config/chromium/Default/Preferences

# Wait for server to start (15 seconds)
@sleep 15

# Start Chromium in kiosk mode (fullscreen)
@chromium-browser --noerrdialogs --disable-infobars --kiosk --incognito http://localhost:3000
```

Save and exit: `Ctrl+X`, `Y`, `Enter`

### Hide Mouse Cursor - Optional (2 minutes)

```bash
sudo apt install -y unclutter

nano ~/.config/lxsession/LXDE-pi/autostart
```

Add this line at the very top (before @xset):
```bash
@unclutter -idle 0.1 -root
```

Save and exit.

### Disable Screen Sleep (3 minutes)

```bash
sudo nano /etc/lightdm/lightdm.conf
```

Press `Ctrl+W`, type `[Seat:*]`, press Enter to search.

Under that section, add this line:
```ini
xserver-command=X -s 0 -dpms
```

Save and exit.

### Test Everything! (5 minutes)

```bash
sudo reboot
```

**The Pi will restart. Wait 1-2 minutes.**

**What should happen:**
1. Pi boots up
2. Desktop appears briefly
3. After ~15 seconds, Chromium opens fullscreen
4. Your noticeboard is displayed!
5. Mouse cursor invisible (if you installed unclutter)
6. Screen never goes blank

**Success!** If you see the noticeboard fullscreen, you're done!

---

## Troubleshooting

### Problem: Noticeboard doesn't appear after reboot

**Check if server is running:**
```bash
# Press Ctrl+Alt+T to open a terminal
pm2 status
```

Should show "online". If not:
```bash
pm2 restart lmrc-noticeboard
```

**Increase wait time:**
```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```
Change `@sleep 15` to `@sleep 30`

### Problem: No data showing (blank panels)

```bash
cd ~/lmrc-noticeboard
npm run scrape
```

Check for errors. Common issues:
- Wrong username/password in `.env`
- No internet connection
- RevSport website temporarily down

### Problem: Screen goes black after some time

```bash
cat ~/.config/lxsession/LXDE-pi/autostart
```

Should include:
```
@xset s off
@xset -dpms
@xset s noblank
```

If missing, add them (see Part 5, Step 2).

### Problem: Chromium doesn't start

**Test manually:**
```bash
chromium-browser --kiosk http://localhost:3000
```

If that works, check autostart file for typos.

---

## Maintenance

### Weekly: Visual Check
- Visit the display
- Is it showing current content?
- Are events/news up to date?

### Monthly: Check Logs

```bash
cd ~/lmrc-noticeboard

# Check scraper is working
tail -100 scraper.log

# Check server is running
pm2 status

# Check disk space
df -h
```

### Updating the Application

When there are new features:

```bash
cd ~/lmrc-noticeboard

# Download latest code
git pull

# Update dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart lmrc-noticeboard
```

### Changing Settings

**Edit timing, colors, etc:**
```bash
cd ~/lmrc-noticeboard
nano config.json
```

Make your changes, save, and exit. Changes apply within 60 seconds (no restart needed).

### System Updates (Every 2-3 months)

```bash
sudo apt update
sudo apt upgrade -y
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

# Scraper
cd ~/lmrc-noticeboard && npm run scrape    # Run manually
tail -50 ~/lmrc-noticeboard/scraper.log    # View log

# System
sudo reboot                         # Restart Pi
sudo shutdown -h now               # Shutdown Pi
df -h                              # Disk space
free -h                            # Memory usage
vcgencmd measure_temp              # Temperature

# Edit Files
cd ~/lmrc-noticeboard
nano .env                          # Edit credentials
nano config.json                   # Edit settings
```

### File Locations

```
/home/pi/lmrc-noticeboard/          Main folder
   .env                             Login credentials
   config.json                      All settings
   server.js                        Server program
   data/                            Scraped data
      gallery-data.json
      events-data.json
      news-data.json
      sponsors-data.json
   scraper.log                      Scraper log file
```

### Remote Access

From another computer on same network:

```bash
# SSH into the Pi
ssh pi@lmrc-noticeboard.local

# Or use IP address
ssh pi@192.168.1.XXX
```

Enter your password when asked.

Now you can manage the Pi without keyboard/mouse/monitor!

---

## Installation Checklist

Track your progress:

- [ ] Hardware purchased
- [ ] Raspberry Pi OS installed on SD card
- [ ] Pi boots and shows desktop
- [ ] System updated (`apt update` & `upgrade`)
- [ ] IP address written down
- [ ] Node.js installed (v20.x)
- [ ] Browser dependencies installed
- [ ] Git installed
- [ ] PM2 installed
- [ ] Repository cloned from GitHub
- [ ] npm install completed successfully
- [ ] .env file configured with credentials
- [ ] Frontend built (`npm run build`)
- [ ] Scraper tested successfully
- [ ] Server tested in browser (localhost:3000)
- [ ] PM2 started and shows "online"
- [ ] PM2 startup enabled
- [ ] PM2 saved
- [ ] Cron job created for hourly scraping
- [ ] Autostart file created
- [ ] Screen blanking disabled
- [ ] Mouse cursor hidden (optional)
- [ ] Reboot test - noticeboard appears automatically
- [ ] Display never goes to sleep

---

## Success!

**Congratulations!** <‰

If you've made it through all the steps, your digital noticeboard should now be:

-  Displaying events, photos, news, and sponsors
-  Updating content automatically every hour
-  Starting automatically when powered on
-  Running fullscreen without any intervention
-  Operating 24/7 without maintenance

**Installation Details:**

Date: ________________

Installed by: ________________

Pi IP Address: ________________

Network: Ethernet / WiFi (circle one)

Notes:
__________________________________________
__________________________________________
__________________________________________

---

**For help or questions, refer to the Troubleshooting section or check the project repository on GitHub.**

**Enjoy your new digital noticeboard!** =£B
