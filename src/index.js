'use strict';

// Load environment variables as the very first thing
require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');

// ── Validate required environment variables ──────────────────────────────
const REQUIRED_ENV = ['DISCORD_TOKEN', 'RIOT_API_KEY'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error('[Startup] Missing required environment variables:', missing.join(', '));
  console.error('[Startup] Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

// ── Internal modules ──────────────────────────────────────────────────────
const db = require('./db/database');
const riotApi = require('./services/riotApi');
const matchService = require('./services/matchService');
const statsService = require('./services/statsService');
const { setupEvents } = require('./bot/events');
const { setupCronJob } = require('./jobs/updateMatches');

// ── Discord client ────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ── Wire everything together ──────────────────────────────────────────────
setupEvents(client, db, riotApi, matchService, statsService);

// ── Start cron job ────────────────────────────────────────────────────────
setupCronJob(matchService.syncAllUsers);

// ── Connect to Discord ────────────────────────────────────────────────────
console.log('[Startup] Connecting to Discord…');

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error('[Startup] Failed to log in to Discord:', err.message);
  process.exit(1);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
function shutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Shutting down gracefully…`);
  client.destroy();
  // better-sqlite3 closes synchronously when the process exits
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
