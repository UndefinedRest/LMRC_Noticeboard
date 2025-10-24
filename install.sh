#!/bin/bash

# LMRC Noticeboard - Quick Installation Script for Raspberry Pi
# Run this script on a fresh Raspberry Pi OS installation

set -e

echo "═══════════════════════════════════════════════"
echo "  LMRC NOTICEBOARD - INSTALLATION SCRIPT"
echo "═══════════════════════════════════════════════"
echo ""

# Check if running as pi user
if [ "$USER" != "pi" ]; then
  echo "⚠️  Warning: This script is designed to run as the 'pi' user"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Update system
echo "📦 Updating system packages..."
sudo apt update
sudo apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"

# Install Chromium (for kiosk display only)
echo "📦 Installing Chromium browser..."
sudo apt install -y chromium-browser

# Install git
echo "📦 Installing git..."
sudo apt install -y git

# Install PM2
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
mkdir -p /home/pi/lmrc-noticeboard
cd /home/pi/lmrc-noticeboard

# Check if files already exist
if [ -f "package.json" ]; then
  echo "✓ Application files already present"
else
  echo "⚠️  Application files not found in current directory"
  echo "Please copy application files to /home/pi/lmrc-noticeboard/"
  echo "Then run: npm install"
  exit 1
fi

# Install dependencies
echo "📦 Installing application dependencies..."
npm install

# Build React application
echo "🔨 Building React application..."
npm run build

# Setup PM2
echo "⚙️  Configuring PM2..."
pm2 start server.js --name lmrc-noticeboard
pm2 startup
echo ""
echo "⚠️  IMPORTANT: Run the command above that PM2 printed"
echo "Press Enter when done..."
read

pm2 save

# Configure autostart
echo "⚙️  Configuring Chromium autostart..."
mkdir -p /home/pi/.config/lxsession/LXDE-pi

cat > /home/pi/.config/lxsession/LXDE-pi/autostart << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Disable screen blanking
@xset s off
@xset -dpms
@xset s noblank

# Start Chromium in kiosk mode
@bash -c 'sleep 10 && chromium-browser --kiosk --app=http://localhost:3000 --start-fullscreen --disable-infobars --noerrdialogs --disable-session-crashed-bubble --disable-gpu'
EOF

# Configure auto-login
echo "⚙️  Configuring auto-login..."
sudo raspi-config nonint do_boot_behaviour B4

echo ""
echo "═══════════════════════════════════════════════"
echo "  INSTALLATION COMPLETE!"
echo "═══════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "1. Configure via Web UI: http://localhost:3000/config"
echo "   - Set club colors, timing, and branding"
echo "   - Configure scraper schedule (default: every 4 hours)"
echo "   - Trigger initial scraper run"
echo "2. Add your club logo: /home/pi/lmrc-noticeboard/public/assets/logo.png"
echo "3. Add sponsor logos: /home/pi/lmrc-noticeboard/public/assets/sponsors/"
echo "4. Reboot to start kiosk mode: sudo reboot"
echo ""
echo "After reboot, the noticeboard will automatically display!"
echo ""
echo "Web Configuration Interface:"
echo "  http://localhost:3000/config  - Configure all settings"
echo "  http://localhost:3000         - View noticeboard"
echo ""
echo "Built-in Scraper Scheduler:"
echo "  ✓ No cron setup needed!"
echo "  ✓ Auto-runs on startup"
echo "  ✓ Configurable via web UI"
echo "  ✓ Default: Every 4 hours"
echo ""
echo "To manage the server:"
echo "  pm2 status              - Check status"
echo "  pm2 logs                - View logs"
echo "  pm2 restart all         - Restart server"
echo ""
echo "To view scraper logs:"
echo "  tail -f /home/pi/lmrc-noticeboard/scraper.log"
echo ""