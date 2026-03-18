'use strict';

const { handleCommand } = require('./commands');

/**
 * Attach all Discord gateway event listeners to the client.
 *
 * @param {import('discord.js').Client} client
 * @param {object} db           Database module
 * @param {object} riotApi      Riot API service module
 * @param {object} matchService Match service module
 * @param {object} statsService Stats service module
 */
function setupEvents(client, db, riotApi, matchService, statsService) {
  const services = { db, riotApi, matchService, statsService };

  // ── Ready ──────────────────────────────────────────────────────────────
  client.once('ready', () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
    console.log(`[Bot] Serving ${client.guilds.cache.size} guild(s)`);
    console.log('[Bot] Ready to receive commands (prefix: /lol)');
  });

  // ── Message create ─────────────────────────────────────────────────────
  client.on('messageCreate', async (message) => {
    // Ignore bot messages and DMs with no prefix
    if (message.author.bot) return;
    if (!message.content.startsWith('/lol ')) return;

    await handleCommand(message, services);
  });

  // ── Error handling ─────────────────────────────────────────────────────
  client.on('error', (err) => {
    console.error('[Discord] Client error:', err);
  });

  client.on('warn', (info) => {
    console.warn('[Discord] Warning:', info);
  });

  // Capture unhandled promise rejections from discord.js internals
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled rejection at:', promise, 'reason:', reason);
  });
}

module.exports = { setupEvents };
