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
echo "📦 Installing Node.js 22.x (latest LTS)..."
if ! command -v node &> /dev/null; then
  # Install prerequisites
  sudo apt-get install -y ca-certificates curl gnupg

  # Create keyring directory
  sudo mkdir -p /etc/apt/keyrings

  # Download NodeSource GPG key
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

  # Add NodeSource repository
  NODE_MAJOR=22
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

  # Install Node.js
  sudo apt-get update
  sudo apt-get install -y nodejs
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"

# Install Chromium (for kiosk display only)
echo "📦 Installing Chromium browser..."
sudo apt install -y chromium-browser

# Install emoji font support (for config page icons)
echo "📦 Installing emoji font support..."
sudo apt-get install -y fonts-noto-color-emoji

# Install git
echo "📦 Installing git..."
sudo apt install -y git

# Install PM2
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
mkdir -p ~/lmrc-noticeboard
cd ~/lmrc-noticeboard

# Check if files already exist
if [ -f "package.json" ]; then
  echo "✓ Application files already present"
else
  echo "⚠️  Application files not found in current directory"
  echo "Please copy application files to ~/lmrc-noticeboard/"
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

# Configure autostart based on desktop environment
echo "⚙️  Configuring Chromium autostart..."

# Detect desktop environment
if [ "$DESKTOP_SESSION" = "LXDE-pi-labwc" ]; then
  echo "Detected new Raspberry Pi OS (Wayland/labwc)"
  echo "⚠️  IMPORTANT: Kiosk mode setup for new Pi OS requires manual configuration"
  echo "After installation completes, follow the instructions for Method B in DEPLOYMENT.md"
  echo "Check with: echo \$DESKTOP_SESSION"
elif [ "$DESKTOP_SESSION" = "LXDE-pi" ]; then
  echo "Detected old Raspberry Pi OS (X11/LXDE)"
  mkdir -p ~/.config/lxsession/LXDE-pi

  cat > ~/.config/lxsession/LXDE-pi/autostart << 'EOF'
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
  echo "✓ Kiosk mode configured for X11/LXDE"
else
  echo "⚠️  Unknown desktop environment: $DESKTOP_SESSION"
  echo "Kiosk mode setup requires manual configuration"
  echo "See DEPLOYMENT.md Part 5: Kiosk Mode"
fi

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
echo "2. Add your club logo: ~/lmrc-noticeboard/public/assets/logo.png"
echo "3. Add sponsor logos: ~/lmrc-noticeboard/public/assets/sponsors/"
if [ "$DESKTOP_SESSION" = "LXDE-pi-labwc" ]; then
  echo "4. ⚠️  Configure kiosk mode (REQUIRED for new Pi OS)"
  echo "   Follow Method B in DEPLOYMENT.md Part 5: Kiosk Mode"
  echo "   Your desktop: $DESKTOP_SESSION (Wayland/labwc)"
fi
echo "5. Reboot to start kiosk mode: sudo reboot"
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
echo "  tail -f ~/lmrc-noticeboard/scraper.log"
echo ""