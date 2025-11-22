/**
 * LMRC Noticeboard Scraper Scheduler
 * Handles automatic and manual scraper execution
 */

import cron from 'node-cron';
import NoticeboardScraper from './scraper/noticeboard-scraper.js';

class ScraperScheduler {
  constructor(config) {
    this.config = config;
    this.task = null;
    this.isRunning = false;
    this.lastRun = null;
    this.lastResult = null;
    this.nextRun = null;
    this.runCount = 0;
  }

  /**
   * Run the scraper
   * @param {boolean} force - If true, bypass schedule checks
   */
  async runScraper(force = false) {
    if (this.isRunning) {
      console.log('[Scheduler] Scraper already running, skipping...');
      return { success: false, message: 'Scraper already running' };
    }

    this.isRunning = true;
    this.lastRun = new Date();
    this.runCount++;

    console.log(`[Scheduler] Starting scraper run #${this.runCount} at ${this.lastRun.toLocaleString()}`);

    const scraper = new NoticeboardScraper();
    try {
      const result = await scraper.scrapeAll(force);
      console.log('[Scheduler] Scraper completed successfully');
      this.isRunning = false;
      this.lastResult = { success: true, timestamp: new Date(), ...result };
      this.updateNextRun();
      return this.lastResult;
    } catch (err) {
      console.error('[Scheduler] Scraper failed:', err);
      this.isRunning = false;
      this.lastResult = {
        success: false,
        timestamp: new Date(),
        error: err.message
      };
      this.updateNextRun();
      return this.lastResult;
    }
  }

  /**
   * Start the scheduled task
   */
  start() {
    const schedule = this.config.scraper?.schedule || '0 * * * *';
    const enabled = this.config.scraper?.scheduleEnabled !== false;

    // Stop existing task if any
    if (this.task) {
      this.task.stop();
      this.task = null;
    }

    if (enabled) {
      // Validate cron schedule
      if (!cron.validate(schedule)) {
        console.error(`[Scheduler] Invalid cron schedule: ${schedule}`);
        return false;
      }

      this.task = cron.schedule(schedule, () => {
        console.log('[Scheduler] Triggered by schedule');
        this.runScraper();
      });

      this.updateNextRun();
      console.log(`[Scheduler] Started with schedule: ${schedule} (${this.getScheduleDescription(schedule)})`);
      return true;
    } else {
      console.log('[Scheduler] Automatic scraping disabled in config');
      this.nextRun = null;
      return false;
    }
  }

  /**
   * Stop the scheduled task
   */
  stop() {
    if (this.task) {
      this.task.stop();
      this.task = null;
      this.nextRun = null;
      console.log('[Scheduler] Stopped');
      return true;
    }
    return false;
  }

  /**
   * Update the schedule
   */
  updateSchedule(newSchedule, enabled) {
    if (newSchedule) {
      this.config.scraper = this.config.scraper || {};
      this.config.scraper.schedule = newSchedule;
    }

    if (typeof enabled !== 'undefined') {
      this.config.scraper = this.config.scraper || {};
      this.config.scraper.scheduleEnabled = enabled;
    }

    return this.start(); // Restart with new schedule
  }

  /**
   * Calculate next run time based on cron schedule
   */
  updateNextRun() {
    if (!this.task || !this.config.scraper?.scheduleEnabled) {
      this.nextRun = null;
      return;
    }

    const schedule = this.config.scraper?.schedule || '0 * * * *';
    const now = new Date();

    // Parse common schedule patterns
    // Format: minute hour day month dayOfWeek
    const parts = schedule.split(' ');

    if (parts.length !== 5) {
      this.nextRun = null;
      return;
    }

    const [minute, hour, , , ] = parts;

    // Calculate next run (simplified - handles common cases)
    const next = new Date(now);

    // Hourly schedules (e.g., "0 * * * *", "30 * * * *")
    if (hour === '*') {
      const targetMinute = minute === '*' ? 0 : parseInt(minute);
      next.setMinutes(targetMinute, 0, 0);

      if (next <= now) {
        next.setHours(next.getHours() + 1);
      }
    }
    // Every N hours (e.g., "0 */2 * * *")
    else if (hour.includes('*/')) {
      const interval = parseInt(hour.split('*/')[1]);
      const targetMinute = minute === '*' ? 0 : parseInt(minute);
      next.setMinutes(targetMinute, 0, 0);

      while (next <= now) {
        next.setHours(next.getHours() + interval);
      }
    }
    // Specific hour (e.g., "0 6 * * *")
    else if (!hour.includes('*')) {
      const targetHour = parseInt(hour);
      const targetMinute = minute === '*' ? 0 : parseInt(minute);
      next.setHours(targetHour, targetMinute, 0, 0);

      if (next <= now) {
        next.setDate(next.getDate() + 1);
      }
    }

    this.nextRun = next;
  }

  /**
   * Get human-readable description of cron schedule
   */
  getScheduleDescription(schedule) {
    const scheduleMap = {
      '* * * * *': 'Every minute',
      '*/5 * * * *': 'Every 5 minutes',
      '*/10 * * * *': 'Every 10 minutes',
      '*/15 * * * *': 'Every 15 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 * * * *': 'Every hour',
      '0 */2 * * *': 'Every 2 hours',
      '0 */3 * * *': 'Every 3 hours',
      '0 */4 * * *': 'Every 4 hours',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '0 0 * * *': 'Daily at midnight',
      '0 6 * * *': 'Daily at 6am',
      '0 12 * * *': 'Daily at noon',
      '0 18 * * *': 'Daily at 6pm',
      '0 6,18 * * *': 'Daily at 6am and 6pm'
    };

    return scheduleMap[schedule] || schedule;
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      enabled: this.config.scraper?.scheduleEnabled !== false,
      schedule: this.config.scraper?.schedule || '0 * * * *',
      scheduleDescription: this.getScheduleDescription(this.config.scraper?.schedule || '0 * * * *'),
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      lastResult: this.lastResult,
      nextRun: this.nextRun,
      runCount: this.runCount,
      runOnStartup: this.config.scraper?.runOnStartup !== false
    };
  }
}

export default ScraperScheduler;
