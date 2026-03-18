'use strict';

const cron = require('node-cron');

// Default: every 10 minutes
const DEFAULT_INTERVAL = '*/10 * * * *';

/**
 * Schedule a recurring job that syncs match data for all registered users.
 *
 * @param {Function} syncAllUsers  Async function from matchService
 * @returns {cron.ScheduledTask}
 */
function setupCronJob(syncAllUsers) {
  const schedule = process.env.CRON_INTERVAL || DEFAULT_INTERVAL;

  if (!cron.validate(schedule)) {
    console.error(`[CronJob] Invalid CRON_INTERVAL: "${schedule}". Using default: ${DEFAULT_INTERVAL}`);
  }

  const validSchedule = cron.validate(schedule) ? schedule : DEFAULT_INTERVAL;

  console.log(`[CronJob] Scheduling match sync with pattern: "${validSchedule}"`);

  const task = cron.schedule(validSchedule, async () => {
    const start = Date.now();
    console.log('[CronJob] Starting scheduled match sync…');

    try {
      const result = await syncAllUsers();
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[CronJob] Sync finished in ${elapsed}s — ` +
        `${result.usersProcessed} user(s), ` +
        `+${result.totalAdded} new matches, ` +
        `${result.totalErrors} error(s)`
      );
    } catch (err) {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.error(`[CronJob] Sync failed after ${elapsed}s:`, err.message);
    }
  });

  return task;
}

module.exports = { setupCronJob };
