# Cloudflare Mitigation Strategies for LMRC Noticeboard

**Problem**: Scraper gets blocked by Cloudflare after a couple of hours, even at 15-minute intervals
**Date**: 2025-10-29
**Status**: Awaiting RevSport guidance + Implementing interim solutions

---

## Executive Summary

Your scraper is making **30+ HTTP requests per scrape cycle** (gallery listing + 10 albums + events + news listing + 20 news articles + sponsors). Even at 15-minute intervals, this is 120+ requests/hour from a single IP, which triggers Cloudflare's bot detection.

**Best Strategy**: Combine **Time-Based Adaptive Scheduling** (Option A) with **Technical Anti-Detection** (Option B) and wait for **Official API Access** from RevSport.

---

## Strategy A: Time-Based Adaptive Scheduling

### Option A1: Peak/Off-Peak Scheduling (RECOMMENDED - Easy Win)

**Concept**: Aggressively refresh during rowing hours, minimal scraping off-peak.

**Schedule**:
```javascript
Peak Hours (5:30am - 8:30am):
  - Every 10 minutes (critical booking window)
  - ~18 requests/hour = 54 total during peak

Off-Peak (8:30am - 5:30pm):
  - Every 2 hours
  - ~1 request/hour = 9 total during day

Evening (5:30pm - 11:00pm):
  - Every 30 minutes (some evening rowing)
  - ~2 requests/hour = 11 total

Overnight (11:00pm - 5:30am):
  - NO SCRAPING (or single refresh at 5:15am for pre-peak cache)
```

**Daily Total**: ~74 scrapes vs 96 (current every 15 min) = **23% reduction**

**Pros**:
- ✅ Matches actual user needs perfectly
- ✅ Reduces total request load significantly
- ✅ Easy to implement (cron schedule change)
- ✅ Data is fresh when it matters most
- ✅ May avoid Cloudflare thresholds

**Cons**:
- ⚠️ Still might trigger blocks during peak period (10 min = aggressive)
- ⚠️ Stale data during off-peak (acceptable for your use case)

**Implementation**:
```bash
# Cron schedule (in lmrc-pi-deployment launcher.sh)
# Peak: 5:30-8:30am every 10 minutes
30-59/10 5 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js
*/10 6-7 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js
0,10,20,30 8 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js

# Off-peak: 8:30am-5:30pm every 2 hours
30 8,10,12,14,16 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js

# Evening: 5:30pm-11pm every 30 minutes
30 17-22 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js
0,30 23 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js

# Pre-peak cache warm: 5:15am
15 5 * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js
```

**Risk**: Medium-Low (still aggressive during peak)
**Effort**: Low (config change only)
**Effectiveness**: 6/10 (reduces load but doesn't solve detection issue)

---

### Option A2: Reduced Peak Frequency (SAFER)

**Concept**: Less aggressive peak scraping to stay under radar.

**Schedule**:
```
Peak (5:30am - 8:30am):  Every 15 minutes (18 requests)
Off-Peak (8:30am - 5:30pm): Every 4 hours (2 requests)
Evening (5:30pm - 11pm):    Every 60 minutes (5 requests)
Overnight:                  NO SCRAPING
```

**Daily Total**: ~25 scrapes = **74% reduction** vs current

**Pros**:
- ✅ Significantly reduces Cloudflare exposure
- ✅ Still provides reasonable freshness during peak
- ✅ Very likely to avoid blocking

**Cons**:
- ⚠️ 15-minute data lag during peak (vs your desired 10 min)
- ⚠️ 4-hour lag during off-peak (but who's watching?)

**Risk**: Low
**Effort**: Low
**Effectiveness**: 7/10

---

### Option A3: Power Management Integration (ULTIMATE)

**Concept**: Turn the Pi OFF completely outside operational hours.

**Hardware**:
- Smart plug with timer (e.g., TP-Link Kasa) - $15-30
- OR: Wake-on-LAN setup with cron on another system
- OR: RTC wake alarm on Pi itself

**Schedule**:
```
5:15am:  Pi powers ON automatically
5:20am:  Scraper runs (pre-cache)
5:30am-8:30am: Scrape every 10-15 minutes
8:30am-11:00pm: Scrape every 1-2 hours
11:00pm: Pi powers OFF (shutdown -h now)
```

**Pros**:
- ✅ Zero requests for 18+ hours per day (11pm-5:15am)
- ✅ Fresh IP each day if ISP uses DHCP
- ✅ Saves power (~$20/year)
- ✅ Impossible to block when offline
- ✅ Matches your stated operational model perfectly

**Cons**:
- ⚠️ Requires hardware (smart plug) or RTC configuration
- ⚠️ No remote access overnight (need timer exception for maintenance)

**Risk**: Very Low
**Effort**: Medium (hardware setup)
**Effectiveness**: 9/10 (best time-based solution)

---

## Strategy B: Technical Anti-Detection Measures

### Option B1: Request Throttling & Randomization (ESSENTIAL)

**Current Problem**: Your scraper makes 30+ requests in rapid succession with zero delay.

**Solution**: Add delays between requests to mimic human browsing.

**Implementation**:
```javascript
// Add to noticeboard-scraper.js

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Random delay between 2-5 seconds
const randomDelay = () => sleep(2000 + Math.random() * 3000);

async function scrapeAll() {
  const galleryData = await this.scrapeGallery();
  await randomDelay(); // 2-5 second pause

  const eventsData = await this.scrapeEvents();
  await randomDelay();

  const newsData = await this.scrapeNews();
  await randomDelay();

  const sponsorsData = await this.scrapeSponsors();

  // ... save data
}
```

**Pros**:
- ✅ Mimics human browsing speed
- ✅ Reduces "burst" detection
- ✅ Easy to implement (10 lines of code)
- ✅ Works with any scheduling strategy

**Cons**:
- ⚠️ Scraping takes 15-30 seconds instead of 5 seconds (acceptable)

**Risk**: Low
**Effort**: Very Low
**Effectiveness**: 7/10 (significant improvement)

---

### Option B2: Enhanced Headers & User-Agent

**Current Problem**: node-fetch uses basic headers that scream "bot".

**Solution**: Add realistic browser headers.

**Implementation**:
```javascript
async fetchHTML(url) {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    // Add referer for subsequent requests
    'Referer': BASE_URL
  };

  const response = await fetch(url, {
    headers,
    signal: controller.signal
  });
  // ...
}
```

**Pros**:
- ✅ Looks like Chrome browser
- ✅ Passes basic bot detection
- ✅ Simple to add

**Cons**:
- ⚠️ Cloudflare can still fingerprint via TLS/HTTP2 patterns
- ⚠️ Not a complete solution alone

**Risk**: Low
**Effort**: Very Low
**Effectiveness**: 5/10 (helps but not sufficient)

---

### Option B3: Cookie/Session Persistence

**Current Problem**: Every scrape creates a new "session" to Cloudflare.

**Solution**: Maintain cookies across scrapes to look like persistent visitor.

**Implementation**:
```javascript
import { CookieJar } from 'tough-cookie';
import { fetch } from 'node-fetch';

class NoticeboardScraper {
  constructor() {
    this.cookieJar = new CookieJar();
  }

  async fetchHTML(url) {
    // Get cookies for this domain
    const cookies = await this.cookieJar.getCookies(url);
    const cookieHeader = cookies.map(c => `${c.key}=${c.value}`).join('; ');

    const headers = {
      // ... existing headers
      'Cookie': cookieHeader
    };

    const response = await fetch(url, { headers });

    // Save new cookies
    const setCookieHeaders = response.headers.raw()['set-cookie'] || [];
    for (const cookie of setCookieHeaders) {
      await this.cookieJar.setCookie(cookie, url);
    }

    return await response.text();
  }
}
```

**Pros**:
- ✅ Maintains Cloudflare challenge tokens
- ✅ Looks like returning visitor (less suspicious)
- ✅ May avoid repeated challenges

**Cons**:
- ⚠️ Requires cookie persistence between script runs
- ⚠️ Moderate code changes

**Risk**: Low
**Effort**: Medium
**Effectiveness**: 6/10

---

### Option B4: Rotating User Agents (ADVANCED)

**Concept**: Change user agent periodically to avoid fingerprinting.

**Recommendation**: **DO NOT DO THIS** - It actually makes you MORE suspicious to Cloudflare (who rotates browsers every hour?).

**Risk**: High (counterproductive)
**Effectiveness**: 2/10 (harmful)

---

## Strategy C: Alternative Data Access

### Option C1: Official API Access from RevSport (BEST - Wait for This)

**Status**: You've already requested this - EXCELLENT move.

**What to Ask For**:
1. Read-only API access for your club's data
2. API key authentication
3. Endpoints for: gallery, events, news, sponsors
4. Rate limit guidance (e.g., "100 requests/hour okay")

**Pros**:
- ✅ Zero blocking risk (you're authorized)
- ✅ Faster, structured JSON responses
- ✅ Lower server load for them
- ✅ Sustainable long-term solution
- ✅ May already exist (many club systems have APIs)

**Cons**:
- ⚠️ Depends on RevSport cooperation
- ⚠️ May take weeks to get access
- ⚠️ May require code rewrite

**Risk**: None (if approved)
**Effort**: Low (if API exists) to High (if you need custom endpoints)
**Effectiveness**: 10/10 (perfect solution)

**If RevSport Says No**: Ask if they can whitelist your IP address

---

### Option C2: IP Whitelisting Request

**Concept**: Ask RevSport to whitelist your static IP in Cloudflare.

**Requirements**:
- Static IP address (or dynamic DNS)
- Formal request to RevSport IT
- Explain legitimate use case

**Pros**:
- ✅ Zero blocking once whitelisted
- ✅ Keep existing scraper code
- ✅ Simple solution if approved

**Cons**:
- ⚠️ Requires static IP ($5-15/month from ISP) or business internet
- ⚠️ RevSport must be willing to configure this
- ⚠️ If your IP changes, breaks until updated

**Risk**: Low (if approved)
**Effort**: Low (config only)
**Effectiveness**: 9/10 (excellent if approved)

---

### Option C3: RSS Feeds / Email Alerts

**Concept**: Check if RevSport offers RSS feeds for news/events.

**Investigation**:
- Check `/feed`, `/rss`, `/atom.xml` on their site
- Check if email notifications include structured data
- Some club systems auto-generate RSS

**Pros**:
- ✅ RSS is designed for polling
- ✅ Won't trigger bot detection
- ✅ Lightweight

**Cons**:
- ⚠️ May not cover all data (gallery, sponsors)
- ⚠️ May not exist at all

**Risk**: None
**Effort**: Low (to check)
**Effectiveness**: 4/10 (partial solution)

---

### Option C4: Manual Content Management (Fallback)

**Concept**: Club admin manually posts content via simple web form.

**Use Case**: If ALL scraping solutions fail.

**Implementation**:
- Create admin panel in Noticeboard app
- Club admin pastes news/events manually
- Upload photos via form
- No scraping needed

**Pros**:
- ✅ 100% reliable (no external dependencies)
- ✅ Full control over content
- ✅ Can include content not on website

**Cons**:
- ⚠️ Manual work required
- ⚠️ Depends on volunteer availability
- ⚠️ Defeats purpose of automation

**Risk**: None (technical)
**Effort**: Medium (build admin UI)
**Effectiveness**: 8/10 (reliable but manual)

---

## Strategy D: Hybrid Approaches

### Option D1: Smart Caching (RECOMMENDED - Quick Win)

**Concept**: Don't scrape data that hasn't changed.

**Implementation**:
```javascript
async scrapeNews() {
  // Fetch news listing first
  const newsLinks = await this.fetchNewsLinks();

  // Load previously scraped IDs
  const previousData = await this.loadPreviousData('news-data.json');
  const previousIds = new Set(previousData.news?.map(n => n.articleId) || []);

  // Only scrape NEW articles
  const newArticles = newsLinks.filter(n => !previousIds.has(n.articleId));

  if (newArticles.length === 0) {
    console.log('[News] No new articles, using cache');
    return previousData; // Return cached data
  }

  console.log(`[News] Found ${newArticles.length} new articles`);

  // Only fetch content for new articles
  // Merge with previous data
  // ...
}
```

**Pros**:
- ✅ Dramatically reduces requests (maybe 5 instead of 30)
- ✅ Faster scraping
- ✅ Works with any schedule
- ✅ Still gets new content immediately

**Cons**:
- ⚠️ Moderate code changes
- ⚠️ Needs careful cache invalidation logic

**Risk**: Low
**Effort**: Medium
**Effectiveness**: 8/10 (excellent optimization)

---

### Option D2: Tiered Refresh Rates

**Concept**: Different content types refresh at different rates.

**Logic**:
- **Events**: Every 4 hours (changes infrequently)
- **News**: Every 1 hour (moderate updates)
- **Gallery**: Once per day (rarely changes)
- **Sponsors**: Once per week (almost never changes)

**Implementation**: Separate scraper modules with individual schedules.

**Pros**:
- ✅ Minimizes unnecessary requests
- ✅ Optimal freshness per content type
- ✅ Further reduces Cloudflare exposure

**Cons**:
- ⚠️ More complex scheduling logic
- ⚠️ Need to refactor scraper into modules

**Risk**: Low
**Effort**: Medium-High
**Effectiveness**: 7/10

---

## Recommended Implementation Plan

### Phase 1: Immediate Actions (Do Now)

1. **Add Request Throttling** (Option B1)
   - Add 2-5 second delays between section scrapes
   - Reduces burst detection
   - 30 minutes to implement

2. **Implement Peak/Off-Peak Schedule** (Option A2 - safer version)
   - Peak: Every 15 minutes (5:30-8:30am)
   - Off-peak: Every 4 hours
   - Overnight: No scraping
   - 15 minutes to implement

3. **Enhanced Headers** (Option B2)
   - Add realistic browser headers
   - 15 minutes to implement

**Expected Result**: Likely avoids blocking for most use cases

---

### Phase 2: If Still Blocked (Next Week)

4. **Smart Caching** (Option D1)
   - Only scrape changed content
   - Major reduction in request volume
   - 2-3 hours to implement

5. **Power Management** (Option A3)
   - Set up smart plug or shutdown script
   - Pi off 11pm-5:15am
   - 1 hour to implement

**Expected Result**: Very low blocking risk

---

### Phase 3: Wait for RevSport (Ongoing)

6. **Official API or Whitelist** (Option C1/C2)
   - Continue discussions with RevSport
   - Best long-term solution
   - Zero implementation if they whitelist IP

---

### Phase 4: Nuclear Option (If All Else Fails)

7. **Manual Content Management** (Option C4)
   - Build simple admin UI
   - Fallback if technical solutions exhausted

---

## Quick Decision Matrix

| Strategy | Effectiveness | Effort | Risk | Time to Implement |
|----------|--------------|--------|------|------------------|
| **Peak/Off-Peak (A2)** | 7/10 | Low | Low | 15 min |
| **Request Throttling (B1)** | 7/10 | Very Low | Low | 30 min |
| **Smart Caching (D1)** | 8/10 | Medium | Low | 2-3 hours |
| **Power Management (A3)** | 9/10 | Medium | Very Low | 1 hour |
| **Official API (C1)** | 10/10 | ? | None | Depends on RevSport |
| **IP Whitelist (C2)** | 9/10 | Low | Low | Depends on RevSport |

---

## Configuration Examples

### Recommended Cron Schedule (Peak/Off-Peak)

```bash
# /etc/cron.d/lmrc-noticeboard-scraper

# Pre-peak cache warm
15 5 * * * lmrc cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1

# Peak hours: Every 15 minutes (5:30-8:30am)
30,45 5 * * * lmrc cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1
*/15 6-7 * * * lmrc cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1
0,15,30 8 * * * lmrc cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1

# Off-peak: Every 4 hours (8:30am-5:30pm)
30 8,12,16 * * * lmrc cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1

# Evening: Every 2 hours (5:30pm-11:30pm)
30 17,19,21,23 * * * lmrc cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1

# Automatic shutdown at 11:00pm (optional)
0 23 * * * root /sbin/shutdown -h +60  # Shutdown in 60 min (gives 11pm scrape time to finish)
```

**Daily scrapes**: 23 total (vs 96 at 15-min intervals) = **76% reduction**

---

### Smart Throttling Configuration

Add to `config.json`:
```json
{
  "scraper": {
    "requestDelayMs": {
      "min": 2000,
      "max": 5000
    },
    "enableSmartCaching": true,
    "cacheValidityHours": {
      "gallery": 24,
      "events": 4,
      "news": 1,
      "sponsors": 168
    }
  }
}
```

---

## Questions for RevSport

When you hear back, ask:

1. **API Access**:
   - "Do you provide API access for clubs to fetch their own data?"
   - "Can we get a read-only API key for gallery/events/news?"

2. **Rate Limits**:
   - "What's a reasonable scraping frequency that won't trigger blocks?"
   - "Can you provide specific rate limit guidelines?"

3. **Whitelisting**:
   - "Can you whitelist our club's IP address in Cloudflare?"
   - "Our IP is [your static IP] - we're scraping for legitimate digital signage"

4. **Best Practices**:
   - "What's the recommended way for clubs to integrate external displays?"
   - "Are there any official integrations or widgets we should use?"

---

## Monitoring & Debugging

Add to your scraper to detect blocking:

```javascript
async fetchHTML(url) {
  const response = await fetch(url, { headers });

  const html = await response.text();

  // Detect Cloudflare challenge page
  if (html.includes('checking your browser') ||
      html.includes('cloudflare') && html.includes('challenge')) {

    console.error('🚫 CLOUDFLARE CHALLENGE DETECTED');
    console.error('URL:', url);
    console.error('Headers:', response.headers);

    // Save HTML for inspection
    await fs.writeFile('/tmp/cloudflare-block.html', html);

    throw new Error('Blocked by Cloudflare');
  }

  return html;
}
```

---

## Summary

**Your peak-time approach is excellent** - it aligns perfectly with actual user needs and dramatically reduces request volume.

**Recommended immediate action**:
1. Implement **Peak/Off-Peak Schedule** (15 min)
2. Add **Request Throttling** (30 min)
3. Add **Enhanced Headers** (15 min)

**Total time**: 1 hour
**Expected result**: Likely solves problem

**Long-term**: Wait for RevSport API/whitelist response - that's the real solution.

**If still blocked after Phase 1**: Implement smart caching and power management.

---

**Questions?** Let me know which options you want to implement first!
