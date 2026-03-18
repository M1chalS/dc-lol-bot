'use strict';

const db = require('../db/database');

// ─── Core stats calculation ────────────────────────────────────────────────

/**
 * Calculate aggregated stats from the last 20 matches for a PUUID and persist
 * the result to the `stats` table.
 *
 * @param {string} puuid
 * @returns {object|null}  The calculated stats object, or null if no matches
 */
function calculateStats(puuid) {
  const matches = db.getMatchesByPuuid(puuid, 20);

  if (!matches || matches.length === 0) return null;

  const total = matches.length;
  const wins = matches.filter((m) => m.win === 1).length;

  const avgKills = avg(matches, 'kills');
  const avgDeaths = avg(matches, 'deaths');
  const avgAssists = avg(matches, 'assists');
  const avgCs = avg(matches, 'cs');
  const avgDamage = avg(matches, 'damage');

  const avgKda = (avgKills + avgAssists) / Math.max(avgDeaths, 1);
  const winrate = (wins / total) * 100;

  const statsData = {
    avg_kda: round(avgKda, 2),
    winrate: round(winrate, 1),
    avg_cs: round(avgCs, 1),
    avg_damage: round(avgDamage, 0),
  };

  db.updateStats(puuid, statsData);

  return statsData;
}

/**
 * Return the champion name this player has played most in the last 20 matches.
 *
 * @param {string} puuid
 * @returns {string|null}
 */
function getFavoriteChampion(puuid) {
  const matches = db.getMatchesByPuuid(puuid, 20);

  if (!matches || matches.length === 0) return null;

  const freq = {};
  for (const m of matches) {
    freq[m.champion] = (freq[m.champion] || 0) + 1;
  }

  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Calculate the current win/loss streak.
 * Positive number = consecutive wins, negative = consecutive losses.
 *
 * @param {string} puuid
 * @returns {number}
 */
function getWinLossStreak(puuid) {
  const matches = db.getMatchesByPuuid(puuid, 20);

  if (!matches || matches.length === 0) return 0;

  const first = matches[0].win; // 1 = win, 0 = loss
  let streak = 0;

  for (const m of matches) {
    if (m.win === first) {
      streak++;
    } else {
      break;
    }
  }

  return first === 1 ? streak : -streak;
}

/**
 * Calculate a composite "performance score" from a single game's stats.
 *
 * Formula: (kills + assists*0.7 - deaths*0.5) + (damage/1000)
 *
 * @param {number} kills
 * @param {number} assists
 * @param {number} deaths
 * @param {number} damage
 * @returns {number}
 */
function getPerformanceScore(kills, assists, deaths, damage) {
  return kills + assists * 0.7 - deaths * 0.5 + damage / 1000;
}

// ─── Rankings ─────────────────────────────────────────────────────────────

/**
 * Build a rankings object covering all registered users.
 * Each category is an array of { user, value } sorted appropriately.
 *
 * @returns {object}
 */
function getRankings() {
  const users = db.getAllUsers();

  if (!users || users.length === 0) {
    return {
      kda: [],
      winrate: [],
      performance: [],
      intMaster: [],
      farmer: [],
      soloCarry: [],
      visionKing: [],
      tiltDetector: [],
    };
  }

  // Build enriched user entries
  const enriched = users.map((user) => {
    const stats = db.getStats(user.puuid) || {};
    const matches = db.getMatchesByPuuid(user.puuid, 20);

    const totalDeaths = matches.reduce((sum, m) => sum + (m.deaths || 0), 0);
    const avgVision = matches.length
      ? avg(matches, 'vision_score')
      : 0;

    const perfScore = matches.length
      ? getPerformanceScore(
          avg(matches, 'kills'),
          avg(matches, 'assists'),
          avg(matches, 'deaths'),
          avg(matches, 'damage')
        )
      : 0;

    const streak = getWinLossStreak(user.puuid);

    return {
      user,
      stats,
      totalDeaths,
      avgVision: round(avgVision, 1),
      perfScore: round(perfScore, 2),
      streak,
    };
  });

  const sortDesc = (arr, key) =>
    [...arr].sort((a, b) => (b[key] ?? -Infinity) - (a[key] ?? -Infinity));

  const sortAsc = (arr, key) =>
    [...arr].sort((a, b) => (a[key] ?? Infinity) - (b[key] ?? Infinity));

  return {
    // Standard ranked categories
    kda: sortDesc(enriched, 'stats.avg_kda').map((e) => ({
      user: e.user,
      value: e.stats.avg_kda ?? 0,
    })),

    winrate: sortDesc(enriched, 'stats.winrate').map((e) => ({
      user: e.user,
      value: e.stats.winrate ?? 0,
    })),

    performance: sortDesc(enriched, 'perfScore').map((e) => ({
      user: e.user,
      value: e.perfScore,
    })),

    // Fun categories
    intMaster: sortDesc(enriched, 'totalDeaths').map((e) => ({
      user: e.user,
      value: e.totalDeaths,
    })),

    farmer: sortDesc(enriched, 'stats.avg_cs').map((e) => ({
      user: e.user,
      value: e.stats.avg_cs ?? 0,
    })),

    soloCarry: sortDesc(enriched, 'stats.avg_damage').map((e) => ({
      user: e.user,
      value: e.stats.avg_damage ?? 0,
    })),

    visionKing: sortDesc(enriched, 'avgVision').map((e) => ({
      user: e.user,
      value: e.avgVision,
    })),

    tiltDetector: sortAsc(enriched, 'streak').map((e) => ({
      user: e.user,
      value: e.streak,
    })),
  };
}

// ─── Private helpers ───────────────────────────────────────────────────────

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length;
}

function round(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

module.exports = {
  calculateStats,
  getFavoriteChampion,
  getWinLossStreak,
  getPerformanceScore,
  getRankings,
};
