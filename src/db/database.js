'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve('./data');
const DB_PATH = path.join(DATA_DIR, 'bot.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id TEXT UNIQUE NOT NULL,
    summoner_name TEXT,
    puuid TEXT,
    game_name TEXT,
    tag_line TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL,
    puuid TEXT NOT NULL,
    champion TEXT,
    kills INTEGER,
    deaths INTEGER,
    assists INTEGER,
    win INTEGER,
    damage INTEGER,
    cs INTEGER,
    vision_score INTEGER,
    game_duration INTEGER,
    timestamp INTEGER,
    UNIQUE(match_id, puuid)
  );

  CREATE TABLE IF NOT EXISTS stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puuid TEXT UNIQUE NOT NULL,
    avg_kda REAL,
    winrate REAL,
    avg_cs REAL,
    avg_damage REAL,
    updated_at INTEGER
  );
`);

// Create indexes for common queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_discord_id ON users(discord_id);
  CREATE INDEX IF NOT EXISTS idx_users_puuid ON users(puuid);
  CREATE INDEX IF NOT EXISTS idx_matches_puuid ON matches(puuid);
  CREATE INDEX IF NOT EXISTS idx_matches_timestamp ON matches(timestamp);
  CREATE INDEX IF NOT EXISTS idx_stats_puuid ON stats(puuid);
`);

// ─── Prepared statements ───────────────────────────────────────────────────

const stmts = {
  getUser: db.prepare('SELECT * FROM users WHERE discord_id = ?'),
  getUserByPuuid: db.prepare('SELECT * FROM users WHERE puuid = ?'),
  addUser: db.prepare(`
    INSERT INTO users (discord_id, summoner_name, puuid, game_name, tag_line, created_at)
    VALUES (@discord_id, @summoner_name, @puuid, @game_name, @tag_line, @created_at)
    ON CONFLICT(discord_id) DO UPDATE SET
      summoner_name = excluded.summoner_name,
      puuid         = excluded.puuid,
      game_name     = excluded.game_name,
      tag_line      = excluded.tag_line
  `),
  getAllUsers: db.prepare('SELECT * FROM users WHERE puuid IS NOT NULL'),
  addMatch: db.prepare(`
    INSERT OR IGNORE INTO matches
      (match_id, puuid, champion, kills, deaths, assists, win, damage, cs, vision_score, game_duration, timestamp)
    VALUES
      (@match_id, @puuid, @champion, @kills, @deaths, @assists, @win, @damage, @cs, @vision_score, @game_duration, @timestamp)
  `),
  getMatchesByPuuid: db.prepare(
    'SELECT * FROM matches WHERE puuid = ? ORDER BY timestamp DESC LIMIT ?'
  ),
  getLastMatch: db.prepare(
    'SELECT * FROM matches WHERE puuid = ? ORDER BY timestamp DESC LIMIT 1'
  ),
  updateStats: db.prepare(`
    INSERT INTO stats (puuid, avg_kda, winrate, avg_cs, avg_damage, updated_at)
    VALUES (@puuid, @avg_kda, @winrate, @avg_cs, @avg_damage, @updated_at)
    ON CONFLICT(puuid) DO UPDATE SET
      avg_kda    = excluded.avg_kda,
      winrate    = excluded.winrate,
      avg_cs     = excluded.avg_cs,
      avg_damage = excluded.avg_damage,
      updated_at = excluded.updated_at
  `),
  getStats: db.prepare('SELECT * FROM stats WHERE puuid = ?'),
};

// ─── Exported functions ────────────────────────────────────────────────────

/**
 * Get a user row by Discord snowflake ID.
 * @param {string} discordId
 * @returns {object|undefined}
 */
function getUser(discordId) {
  return stmts.getUser.get(discordId);
}

/**
 * Get a user row by Riot PUUID.
 * @param {string} puuid
 * @returns {object|undefined}
 */
function getUserByPuuid(puuid) {
  return stmts.getUserByPuuid.get(puuid);
}

/**
 * Insert or update a user record.
 * @param {string} discordId
 * @param {string} summonerName  Legacy summoner name (may be empty string)
 * @param {string} puuid
 * @param {string} gameName      Riot ID game name
 * @param {string} tagLine       Riot ID tag line
 */
function addUser(discordId, summonerName, puuid, gameName, tagLine) {
  return stmts.addUser.run({
    discord_id: discordId,
    summoner_name: summonerName || '',
    puuid,
    game_name: gameName,
    tag_line: tagLine,
    created_at: Date.now(),
  });
}

/**
 * Return all users that have a PUUID (i.e. have been linked to a Riot account).
 * @returns {object[]}
 */
function getAllUsers() {
  return stmts.getAllUsers.all();
}

/**
 * Insert a match record (silently ignored if match_id+puuid already exists).
 * @param {object} matchData
 */
function addMatch(matchData) {
  return stmts.addMatch.run(matchData);
}

/**
 * Return up to `limit` matches for a PUUID, newest first.
 * @param {string} puuid
 * @param {number} [limit=20]
 * @returns {object[]}
 */
function getMatchesByPuuid(puuid, limit = 20) {
  return stmts.getMatchesByPuuid.all(puuid, limit);
}

/**
 * Return the single most recent match for a PUUID.
 * @param {string} puuid
 * @returns {object|undefined}
 */
function getLastMatch(puuid) {
  return stmts.getLastMatch.get(puuid);
}

/**
 * Upsert aggregated stats for a PUUID.
 * @param {string} puuid
 * @param {object} statsData  { avg_kda, winrate, avg_cs, avg_damage }
 */
function updateStats(puuid, statsData) {
  return stmts.updateStats.run({
    puuid,
    avg_kda: statsData.avg_kda,
    winrate: statsData.winrate,
    avg_cs: statsData.avg_cs,
    avg_damage: statsData.avg_damage,
    updated_at: Date.now(),
  });
}

/**
 * Get aggregated stats for a PUUID.
 * @param {string} puuid
 * @returns {object|undefined}
 */
function getStats(puuid) {
  return stmts.getStats.get(puuid);
}

module.exports = {
  db,
  getUser,
  getUserByPuuid,
  addUser,
  getAllUsers,
  addMatch,
  getMatchesByPuuid,
  getLastMatch,
  updateStats,
  getStats,
};
