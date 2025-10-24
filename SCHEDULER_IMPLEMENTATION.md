# Scraper Scheduler Implementation

## Overview

The LMRC Noticeboard now includes an automated scraper scheduler with web-based controls. This allows you to:

1. **Auto-run scraper on server startup**
2. **Schedule automatic scraping** at configurable intervals
3. **Manually trigger scraping** from the config web interface

## Features Implemented

### ✅ Phase 1: Scheduler Module
- Created `server-scheduler.js` - In-process scheduler using node-cron
- Manages scraper execution, status tracking, and schedule management
- Calculates next run time for common cron patterns
- Provides human-readable schedule descriptions

### ✅ Phase 2: API Endpoints
- `GET /api/scraper/status` - Get scraper status and schedule info
- `POST /api/scraper/trigger` - Manually run scraper immediately
- `POST /api/scraper/schedule` - Update scraper schedule/enable state

### ✅ Phase 3: Config UI Controls
- Added **Scraper Controls** section to config page overview
- Real-time status display (running, last run, next run, run count)
- **"Run Scraper Now"** button for manual triggers
- Schedule preset dropdown (every 1, 2, 3, 4, 6, 12 hours, daily options)
- Enable/disable toggle for automatic scraping

### ✅ Phase 4: Configuration
- Updated `config.json` with scraper schedule settings:
  - `scheduleEnabled`: true/false
  - `schedule`: cron format (default: "0 * * * *" = hourly)
  - `runOnStartup`: true/false (default: true)

---

## How to Use

### Testing the Implementation

1. **Restart the server** (port 3000 was in use during implementation):
   ```bash
   # Kill any existing node processes
   taskkill /IM node.exe /F

   # Start fresh
   npm start
   ```

2. **Navigate to Config Page**:
   ```
   http://localhost:3000/config
   ```

3. **You should see**:
   - New "Scraper Controls" section in Overview tab
   - Status display showing: Status, Last Run, Next Run, Run Count
   - Green "▶️ Run Scraper Now" button
   - Schedule configuration with presets
   - Enable/Disable checkbox

### Manual Trigger

Click the **"▶️ Run Scraper Now"** button to immediately trigger a scraper run. The button will show:
- "⏳ Running..." while executing
- Disabled state if already running
- Success/error message after completion

### Schedule Configuration

1. **Enable/Disable Automatic Scraping**:
   - Check/uncheck "Enable Automatic Scraping" checkbox
   - Changes save immediately

2. **Change Schedule**:
   - Select from preset dropdown:
     - Every hour (0 * * * *)
     - Every 2 hours (0 */2 * * *)
     - Every 3 hours (0 */3 * * *)
     - Every 4 hours (0 */4 * * *)
     - Every 6 hours (0 */6 * * *)
     - Every 12 hours (0 */12 * * *)
     - Daily at 6am (0 6 * * *)
     - Daily at 6am & 6pm (0 6,18 * * *)
   - Changes save immediately and restart the scheduler

### API Testing

Test the endpoints directly:

```bash
# Get scraper status
curl http://localhost:3000/api/scraper/status

# Example response:
{
  "enabled": true,
  "schedule": "0 * * * *",
  "scheduleDescription": "Every hour",
  "isRunning": false,
  "lastRun": "2025-10-24T02:00:00.000Z",
  "lastResult": { "success": true, ... },
  "nextRun": "2025-10-24T03:00:00.000Z",
  "runCount": 5,
  "runOnStartup": true
}

# Manually trigger scraper
curl -X POST http://localhost:3000/api/scraper/trigger

# Update schedule
curl -X POST http://localhost:3000/api/scraper/schedule \
  -H "Content-Type: application/json" \
  -d '{"schedule": "0 */4 * * *", "enabled": true}'
```

---

## Configuration

### config.json

```json
{
  "scraper": {
    "baseUrl": "https://www.lakemacquarierowingclub.org.au",
    "paths": { ... },
    "scheduleEnabled": true,
    "schedule": "0 * * * *",
    "runOnStartup": true,
    "maxRetries": 3,
    "timeoutSeconds": 30
  }
}
```

**Options**:
- `scheduleEnabled` - Enable/disable automatic scraping
- `schedule` - Cron format schedule string
- `runOnStartup` - Run scraper when server starts
- `maxRetries` - Retry failed scrapes
- `timeoutSeconds` - HTTP request timeout

### Cron Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
* * * * *
```

**Examples**:
- `0 * * * *` = Every hour
- `0 */2 * * *` = Every 2 hours
- `0 6 * * *` = Daily at 6am
- `0 6,18 * * *` = 6am and 6pm daily
- `*/30 * * * *` = Every 30 minutes

---

## Technical Details

### Architecture

```
┌─────────────────────────────────────┐
│      server.js (Express)            │
│  ┌─────────────────────────────┐   │
│  │  ScraperScheduler Instance  │   │
│  │  - Manages cron task        │   │
│  │  - Tracks status            │   │
│  │  - Executes scraper         │   │
│  └─────────────────────────────┘   │
│              │                       │
│              ▼                       │
│  ┌─────────────────────────────┐   │
│  │  NoticeboardScraper         │   │
│  │  - Fetches RevSport data    │   │
│  │  - Saves to JSON files      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │ data/*.json  │
    └──────────────┘
```

### Key Files

1. **`server-scheduler.js`** - ScraperScheduler class
   - Manages cron task lifecycle
   - Prevents concurrent runs
   - Tracks status and history
   - Calculates next run times

2. **`server.js`** (additions)
   - Initializes scheduler on startup
   - Watches config.json for changes
   - Exports scheduler for API endpoints
   - Adds 3 new API endpoints

3. **`src/ConfigEditor.jsx`** (additions)
   - ScraperControls component
   - Real-time status polling (10s interval)
   - Schedule presets dropdown
   - Manual trigger button

4. **`config.json`** (additions)
   - scraper.scheduleEnabled
   - scraper.schedule
   - scraper.runOnStartup

---

## Raspberry Pi Deployment

### Auto-Start with PM2

The scheduler is built-in, so the same PM2 setup works:

```bash
# On Raspberry Pi
pm2 start server.js --name lmrc-noticeboard
pm2 save
pm2 startup
```

**No separate cron job needed!** The scheduler runs inside the Node.js process.

### Benefits vs External Cron

| Feature | External Cron | Built-in Scheduler |
|---------|--------------|-------------------|
| **Configuration** | Edit crontab via SSH | Web UI |
| **Status visibility** | Check logs | Real-time dashboard |
| **Manual trigger** | SSH required | Click button |
| **Process management** | Two processes | One process |
| **Deployment complexity** | Setup cron + server | Just server |

---

## Monitoring

### Check Logs

```bash
# PM2 logs
pm2 logs lmrc-noticeboard

# Look for:
[Scheduler] Starting scraper run #N at ...
[Scheduler] Scraper completed successfully
[Scheduler] Started with schedule: 0 * * * * (Every hour)
```

### Status Indicators

In the Config UI, status colors indicate:
- 🔄 **Running...** - Scraper is currently executing
- ✅ **Idle** - Scraper is ready, waiting for next schedule
- **Last Run** - Timestamp of last execution
- **Next Run** - When scraper will run next
- **Run Count** - Total runs since server started

---

## Troubleshooting

### Scraper Not Running Automatically

1. **Check config.json**:
   ```json
   "scheduleEnabled": true  // Must be true
   ```

2. **Check server logs**:
   ```bash
   pm2 logs lmrc-noticeboard --lines 50
   ```

3. **Verify schedule format**:
   - Use `/api/scraper/status` to see current schedule
   - Ensure cron format is valid

### Manual Trigger Not Working

1. **Check if scraper is already running**:
   - Button disabled = already running
   - Wait for current run to complete

2. **Check API response**:
   ```bash
   curl -X POST http://localhost:3000/api/scraper/trigger
   ```

3. **Check server logs** for errors

### Schedule Not Updating

1. **Verify config.json was saved**:
   ```bash
   cat config.json | grep schedule
   ```

2. **Restart server if config watcher failed**:
   ```bash
   pm2 restart lmrc-noticeboard
   ```

---

## Future Enhancements (Not Implemented)

- [ ] Email notifications on scraper failures
- [ ] Scraper history/log viewer in UI
- [ ] Custom cron input (currently preset-only)
- [ ] Per-data-type scraping (gallery only, events only, etc.)
- [ ] Webhook triggers for external automation
- [ ] Scraper performance metrics dashboard

---

## Dependencies

- **node-cron**: `^3.0.3` - Cron job scheduling
- **express**: Existing - API endpoints
- **React**: Existing - Config UI

---

## Commit Message

```
feat: add automated scraper scheduler with web controls

Implements comprehensive scraper automation system:

Features:
- In-process cron scheduler (node-cron)
- Auto-run on server startup (configurable)
- Configurable schedules via web UI
- Manual trigger button
- Real-time status monitoring

API Endpoints:
- GET /api/scraper/status - Get scheduler status
- POST /api/scraper/trigger - Run scraper manually
- POST /api/scraper/schedule - Update schedule

UI Components:
- Scraper Controls section in config overview
- Status dashboard (running, last run, next run, count)
- Schedule presets dropdown
- Enable/disable toggle

Configuration:
- config.scraper.scheduleEnabled
- config.scraper.schedule (cron format)
- config.scraper.runOnStartup

Files modified:
- server-scheduler.js: New scheduler module
- server.js: Scheduler integration + API endpoints
- src/ConfigEditor.jsx: Scraper controls UI
- config.json: Schedule settings
- package.json: Added node-cron dependency

No breaking changes. Backward compatible.
```

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Scraper runs on startup (if enabled)
- [ ] `/api/scraper/status` returns valid JSON
- [ ] Manual trigger button works
- [ ] Schedule updates via UI
- [ ] Enable/disable toggle works
- [ ] Next run time updates correctly
- [ ] Cron schedule executes on time
- [ ] Config changes reload scheduler
- [ ] PM2 restarts work correctly

---

## Summary

✅ **Implementation Complete**

The scraper scheduler is fully implemented and ready for testing. Once you restart the server (to clear the port 3000 conflict), navigate to `http://localhost:3000/config` and you'll see the new Scraper Controls section.

**Benefits**:
- ✅ No more manual scraping
- ✅ No external cron setup needed
- ✅ Easy schedule changes via web UI
- ✅ Real-time monitoring
- ✅ One-click manual triggers
- ✅ Production-ready for Raspberry Pi
