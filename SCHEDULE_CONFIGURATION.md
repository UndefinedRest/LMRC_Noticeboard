# Noticeboard Scraper Schedule Configuration

**Version**: 1.1.0
**Date**: 2025-10-29
**Purpose**: Avoid Cloudflare blocking with intelligent, configurable scheduling

---

## Overview

The scraper now includes Cloudflare avoidance features:
- ✅ **Configurable time windows** (peak/off-peak/evening)
- ✅ **Request throttling** (2-5 second delays between sections)
- ✅ **Enhanced browser headers** (looks like Chrome)
- ✅ **Cloudflare detection** (saves challenge pages for debugging)
- ✅ **Seasonal adjustment** (edit config.json to change schedule)

---

## Current Configuration

### Schedule Windows

Located in `config.json` under `scraper.cloudflareAvoidance.scheduleWindows`:

```json
{
  "name": "peak",
  "startTime": "05:30",
  "endTime": "08:30",
  "intervalMinutes": 15,
  "description": "High frequency during morning rowing sessions"
}
```

**Current Schedule:**
- **Peak** (05:30-08:30): Every 15 minutes (~12 scrapes)
- **Off-Peak** (08:30-17:30): Every 240 minutes (4 hours) (~2 scrapes)
- **Evening** (17:30-23:00): Every 120 minutes (2 hours) (~3 scrapes)
- **Overnight** (23:00-05:30): No scraping (outside all windows)

**Total**: ~17 scrapes/day (vs 96 at constant 15-minute intervals) = **82% reduction**

---

## Adjusting for Seasons

### Winter Schedule (Current)
```json
{
  "scheduleWindows": [
    {
      "name": "peak",
      "startTime": "05:30",
      "endTime": "08:30",
      "intervalMinutes": 15
    }
  ]
}
```

### Summer Schedule (Daylight Savings)
Edit `config.json` to shift times forward by 1 hour:

```json
{
  "scheduleWindows": [
    {
      "name": "peak",
      "startTime": "06:30",  // Changed from 05:30
      "endTime": "09:30",    // Changed from 08:30
      "intervalMinutes": 15
    },
    {
      "name": "off-peak",
      "startTime": "09:30",  // Changed from 08:30
      "endTime": "18:30",    // Changed from 17:30
      "intervalMinutes": 240
    },
    {
      "name": "evening",
      "startTime": "18:30",  // Changed from 17:30
      "endTime": "23:00",
      "intervalMinutes": 120
    }
  ]
}
```

### Extended Summer Hours
If summer rowing goes later:

```json
{
  "scheduleWindows": [
    {
      "name": "peak",
      "startTime": "05:30",
      "endTime": "08:30",
      "intervalMinutes": 15
    },
    {
      "name": "midday",
      "startTime": "08:30",
      "endTime": "16:00",
      "intervalMinutes": 240
    },
    {
      "name": "afternoon-peak",
      "startTime": "16:00",
      "endTime": "19:00",
      "intervalMinutes": 30,
      "description": "Afternoon rowing sessions"
    },
    {
      "name": "evening",
      "startTime": "19:00",
      "endTime": "23:00",
      "intervalMinutes": 120
    }
  ]
}
```

---

## Adjusting Scraping Frequency

### More Aggressive (if not being blocked)

**Peak hours every 10 minutes:**
```json
{
  "name": "peak",
  "startTime": "05:30",
  "endTime": "08:30",
  "intervalMinutes": 10  // Changed from 15
}
```

**Off-peak every 2 hours:**
```json
{
  "name": "off-peak",
  "startTime": "08:30",
  "endTime": "17:30",
  "intervalMinutes": 120  // Changed from 240
}
```

### Less Aggressive (if still being blocked)

**Peak hours every 30 minutes:**
```json
{
  "name": "peak",
  "startTime": "05:30",
  "endTime": "08:30",
  "intervalMinutes": 30  // Changed from 15
}
```

**Off-peak once only:**
```json
{
  "name": "off-peak",
  "startTime": "12:00",
  "endTime": "12:01",
  "intervalMinutes": 1440,  // 24 hours
  "description": "Single midday refresh"
}
```

---

## Adjusting Request Delays

In `config.json` under `scraper.cloudflareAvoidance.requestDelayMs`:

```json
{
  "requestDelayMs": {
    "min": 2000,  // Minimum 2 seconds
    "max": 5000   // Maximum 5 seconds
  }
}
```

**More aggressive (faster scraping, higher risk):**
```json
{
  "requestDelayMs": {
    "min": 1000,  // 1 second
    "max": 2000   // 2 seconds
  }
}
```

**Less aggressive (slower scraping, lower risk):**
```json
{
  "requestDelayMs": {
    "min": 5000,   // 5 seconds
    "max": 10000   // 10 seconds
  }
}
```

---

## Disabling Cloudflare Avoidance

If RevSport provides API access or whitelists your IP, you can disable all avoidance features:

```json
{
  "cloudflareAvoidance": {
    "enabled": false
  }
}
```

This will:
- ❌ Ignore schedule windows (scrape whenever cron runs)
- ❌ Remove request delays (faster scraping)
- ✅ Keep enhanced headers (harmless)
- ✅ Keep Cloudflare detection (useful for monitoring)

---

## Testing Schedule Changes

### 1. Edit config.json
```bash
nano /opt/lmrc/noticeboard/config.json
```

### 2. Test manually
```bash
cd /opt/lmrc/noticeboard
node scraper/noticeboard-scraper.js
```

**Expected output if INSIDE window:**
```
[Schedule] In "peak" window (05:30-08:30)
[Schedule] Configured interval: 15 minutes
[Schedule] ✓ Scraping should proceed
```

**Expected output if OUTSIDE window:**
```
[Schedule] Current time 23:45 is outside all configured windows
⏰ Skipping scrape - outside configured schedule
```

**Expected output if TOO SOON:**
```
[Schedule] In "peak" window (05:30-08:30)
[Schedule] Last run: 5.2 minutes ago
[Schedule] Too soon! Wait 9.8 more minutes
```

### 3. Check logs
```bash
tail -f /opt/lmrc/shared/logs/scraper.log
```

---

## Monitoring

### Check last run time
```bash
cat /opt/lmrc/noticeboard/data/.last-scrape-timestamp
# Outputs Unix timestamp in milliseconds
```

### Convert to readable date
```bash
date -d @$(( $(cat /opt/lmrc/noticeboard/data/.last-scrape-timestamp) / 1000 ))
```

### Check if Cloudflare is blocking
```bash
ls -la /opt/lmrc/noticeboard/data/cloudflare-block.html
# File exists = we got blocked
```

### View saved challenge page
```bash
cat /opt/lmrc/noticeboard/data/cloudflare-block.html | grep -i challenge
```

---

## Troubleshooting

### Scraper runs but skips every time
**Symptom**: Logs show "outside configured schedule" at correct times

**Fix**: Check system time is correct
```bash
timedatectl status
# Ensure timezone matches your location
```

**Set timezone** (if needed):
```bash
sudo timedatectl set-timezone Australia/Sydney
```

### Scraper never runs
**Check cron job**:
```bash
crontab -u lmrc -l | grep noticeboard
# Should show: */10 * * * * cd /opt/lmrc/noticeboard && ...
```

### Still getting blocked
1. **Reduce frequency**: Increase `intervalMinutes` in config.json
2. **Increase delays**: Set `requestDelayMs.max` to 10000 (10 seconds)
3. **Wait for RevSport**: Request API access or IP whitelisting
4. **Check logs** for `🚫 CLOUDFLARE CHALLENGE DETECTED`

---

## Quick Reference

| Time Period | Current Interval | Scrapes/Day | Adjust To |
|-------------|-----------------|-------------|-----------|
| Peak (5:30-8:30am) | 15 min | ~12 | 10-30 min |
| Off-Peak (8:30am-5:30pm) | 4 hours | ~2 | 2-8 hours |
| Evening (5:30-11pm) | 2 hours | ~3 | 1-4 hours |
| Overnight | None | 0 | Leave as-is |

**Request Delays**: 2-5 seconds (adjust to 1-10 seconds)

**Total Requests/Day**: ~17 scrapes × 30 requests = ~510 requests (vs 2,880 at constant 15-min)

---

## Example Configurations

### Ultra-Conservative (Avoid Blocking at All Costs)
```json
{
  "cloudflareAvoidance": {
    "enabled": true,
    "requestDelayMs": { "min": 5000, "max": 10000 },
    "scheduleWindows": [
      {
        "name": "morning",
        "startTime": "06:00",
        "endTime": "06:01",
        "intervalMinutes": 1440
      },
      {
        "name": "evening",
        "startTime": "18:00",
        "endTime": "18:01",
        "intervalMinutes": 1440
      }
    ]
  }
}
```
**Result**: 2 scrapes per day only

### Balanced (Recommended Starting Point)
```json
{
  "cloudflareAvoidance": {
    "enabled": true,
    "requestDelayMs": { "min": 3000, "max": 6000 },
    "scheduleWindows": [
      {
        "name": "peak",
        "startTime": "05:30",
        "endTime": "08:30",
        "intervalMinutes": 20
      },
      {
        "name": "off-peak",
        "startTime": "08:30",
        "endTime": "17:30",
        "intervalMinutes": 180
      },
      {
        "name": "evening",
        "startTime": "17:30",
        "endTime": "23:00",
        "intervalMinutes": 180
      }
    ]
  }
}
```
**Result**: ~12 scrapes per day

### Aggressive (If RevSport Approves)
```json
{
  "cloudflareAvoidance": {
    "enabled": true,
    "requestDelayMs": { "min": 1000, "max": 2000 },
    "scheduleWindows": [
      {
        "name": "peak",
        "startTime": "05:30",
        "endTime": "08:30",
        "intervalMinutes": 10
      },
      {
        "name": "day",
        "startTime": "08:30",
        "endTime": "23:00",
        "intervalMinutes": 60
      }
    ]
  }
}
```
**Result**: ~33 scrapes per day

---

## Contact RevSport

If you get API access or IP whitelisting from RevSport:

1. **Set `enabled: false`** to disable avoidance features
2. **Update cron** to your desired frequency
3. **Update documentation** with new approach

---

**Questions?** See [CLOUDFLARE_MITIGATION_STRATEGIES.md](./CLOUDFLARE_MITIGATION_STRATEGIES.md) for detailed technical background.
