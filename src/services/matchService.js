'use strict';

const db = require('../db/database');
const riotApi = require('./riotApi');

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Extract and normalise the participant block that belongs to `puuid`
 * from a full match-v5 response.
 *
 * @param {object} matchDetails  Full Riot match-v5 response object
 * @param {string} puuid
 * @returns {object|null}  Structured match row ready to INSERT, or null on error
 */
function processMatch(matchDetails, puuid) {
  try {
    const { metadata, info } = matchDetails;

    if (!metadata || !info) return null;

    const participant = info.participants.find((p) => p.puuid === puuid);

    if (!participant) {
      console.warn(`[matchService] PUUID ${puuid} not found in match ${metadata.matchId}`);
      return null;
    }

    return {
      match_id: metadata.matchId,
      puuid,
      champion: participant.championName,
      kills: participant.kills,
      deaths: participant.deaths,
      assists: participant.assists,
      win: participant.win ? 1 : 0,
      damage: participant.totalDamageDealtToChampions,
      cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
      vision_score: participant.visionScore,
      game_duration: info.gameDuration, // seconds
      timestamp: info.gameEndTimestamp || info.gameCreation,
    };
  } catch (err) {
    console.error('[matchService] Error processing match:', err.message);
    return null;
  }
}

/**
 * Fetch all new matches for a single user and persist them to the database.
 *
 * @param {object} user  Row from the `users` table
 * @returns {Promise<{added: number, errors: number}>}
 */
async function syncUserMatches(user) {
  const { puuid, game_name, tag_line } = user;
  const displayName = `${game_name}#${tag_line}`;

  let added = 0;
  let errors = 0;

  try {
    // Fetch up to 20 recent ranked match IDs from Riot
    const matchIds = await riotApi.getMatchIds(puuid, 20);

    if (!matchIds || matchIds.length === 0) {
      console.log(`[matchService] No match IDs returned for ${displayName}`);
      return { added, errors };
    }

    // Determine which match IDs we already have stored
    const existing = new Set(
      db.getMatchesByPuuid(puuid, 200).map((m) => m.match_id)
    );

    const newIds = matchIds.filter((id) => !existing.has(id));

    if (newIds.length === 0) {
      console.log(`[matchService] ${displayName} is already up-to-date`);
      return { added, errors };
    }

    console.log(`[matchService] Fetching ${newIds.length} new matches for ${displayName}`);

    // Sequential fetching to be friendly to the rate limiter
    for (const matchId of newIds) {
      try {
        const details = await riotApi.getMatchDetails(matchId);

        if (!details) {
          errors++;
          continue;
        }

        const matchData = processMatch(details, puuid);

        if (!matchData) {
          errors++;
          continue;
        }

        db.addMatch(matchData);
        added++;

        // Small pause between requests to reduce rate-limit pressure
        await sleep(50);
      } catch (err) {
        console.error(`[matchService] Error fetching match ${matchId}:`, err.message);
        errors++;
      }
    }

    console.log(`[matchService] ${displayName}: +${added} matches, ${errors} errors`);
  } catch (err) {
    console.error(`[matchService] Error syncing ${displayName}:`, err.message);
    errors++;
  }

  return { added, errors };
}

/**
 * Sync matches for every registered user.
 *
 * @returns {Promise<{totalAdded: number, totalErrors: number, usersProcessed: number}>}
 */
async function syncAllUsers() {
  const users = db.getAllUsers();

  if (users.length === 0) {
    console.log('[matchService] No users registered yet');
    return { totalAdded: 0, totalErrors: 0, usersProcessed: 0 };
  }

  console.log(`[matchService] Syncing ${users.length} user(s)…`);

  let totalAdded = 0;
  let totalErrors = 0;

  for (const user of users) {
    const { added, errors } = await syncUserMatches(user);
    totalAdded += added;
    totalErrors += errors;

    // Pause between users to stay well within rate limits
    await sleep(500);
  }

  console.log(
    `[matchService] Sync complete — added ${totalAdded} matches, ${totalErrors} errors across ${users.length} user(s)`
  );

  return { totalAdded, totalErrors, usersProcessed: users.length };
}

// ─── Utility ───────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  processMatch,
  syncUserMatches,
  syncAllUsers,
};
