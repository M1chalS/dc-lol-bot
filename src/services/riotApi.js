'use strict';

const axios = require('axios');

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION = (process.env.REGION || 'europe').toLowerCase();
const PLATFORM = (process.env.PLATFORM || 'eun1').toLowerCase();

// Regional routing – used for account-v1 and match-v5
const REGIONAL_BASE = `https://${REGION}.api.riotgames.com`;

// Platform routing – used for summoner-v4
const PLATFORM_BASE = `https://${PLATFORM}.api.riotgames.com`;

/** Shared axios instance with the Riot API key header */
const client = axios.create({
  headers: { 'X-Riot-Token': RIOT_API_KEY },
  timeout: 10_000,
});

/**
 * Generic GET helper.
 * Returns the response data on success.
 * Returns null on 404 or 429 (rate-limit), throws on other errors.
 *
 * @param {string} url
 * @param {object} [params]
 * @returns {Promise<any|null>}
 */
async function apiGet(url, params = {}) {
  try {
    const res = await client.get(url, { params });
    return res.data;
  } catch (err) {
    if (err.response) {
      const status = err.response.status;

      if (status === 404) {
        return null;
      }

      if (status === 429) {
        const retryAfter = err.response.headers['retry-after'] || '?';
        console.warn(`[RiotAPI] Rate limited. Retry-After: ${retryAfter}s — ${url}`);
        return null;
      }

      if (status === 403) {
        console.error('[RiotAPI] 403 Forbidden – is your RIOT_API_KEY valid and not expired?');
        return null;
      }

      console.error(`[RiotAPI] HTTP ${status} for ${url}:`, err.response.data);
      return null;
    }

    // Network / timeout errors
    console.error(`[RiotAPI] Network error for ${url}:`, err.message);
    return null;
  }
}

// ─── Public API functions ──────────────────────────────────────────────────

/**
 * Resolve a Riot ID (gameName + tagLine) to an account object containing the PUUID.
 *
 * @param {string} gameName  e.g. "Faker"
 * @param {string} tagLine   e.g. "T1"
 * @returns {Promise<{puuid: string, gameName: string, tagLine: string}|null>}
 */
async function getPuuidByRiotId(gameName, tagLine) {
  const url = `${REGIONAL_BASE}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return apiGet(url);
}

/**
 * Fetch the most recent match IDs for a PUUID.
 *
 * @param {string} puuid
 * @param {number} [count=20]
 * @returns {Promise<string[]|null>}
 */
async function getMatchIds(puuid, count = 20) {
  const url = `${REGIONAL_BASE}/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids`;
  return apiGet(url, { count, queue: 420 }); // 420 = Solo/Duo ranked; remove queue filter if you want all modes
}

/**
 * Fetch full details for a single match.
 *
 * @param {string} matchId  e.g. "EUN1_1234567890"
 * @returns {Promise<object|null>}
 */
async function getMatchDetails(matchId) {
  const url = `${REGIONAL_BASE}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return apiGet(url);
}

/**
 * Look up a summoner by name (legacy endpoint, still useful for display info).
 * Accepts "name#tag" format and falls back to platform tag when no tag is given.
 *
 * @param {string} summonerName  Either "PlayerName" or "PlayerName#TAG"
 * @returns {Promise<object|null>}
 */
async function getSummonerByName(summonerName) {
  // If the caller passed a Riot-ID style string, strip the tag part
  const name = summonerName.includes('#')
    ? summonerName.split('#')[0]
    : summonerName;

  const url = `${PLATFORM_BASE}/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`;
  return apiGet(url);
}

module.exports = {
  getPuuidByRiotId,
  getMatchIds,
  getMatchDetails,
  getSummonerByName,
};
