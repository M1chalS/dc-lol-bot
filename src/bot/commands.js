'use strict';

const { EmbedBuilder } = require('discord.js');
const { getQueueDescription } = require("../utils/queueConstants");
const { formatChampionName } = require('../utils/championName');

// ─── Colour palette ────────────────────────────────────────────────────────
const COLOR = {
  INFO: 0x3498db,
  SUCCESS: 0x2ecc71,
  WIN: 0x2ecc71,
  LOSS: 0xe74c3c,
  ERROR: 0xe74c3c,
  WARNING: 0xf39c12,
  GOLD: 0xf1c40f,
};

// ─── Embed helpers ─────────────────────────────────────────────────────────

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLOR.INFO)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function errorEmbed(description) {
  return new EmbedBuilder()
    .setColor(COLOR.ERROR)
    .setTitle('Error')
    .setDescription(description)
    .setTimestamp();
}

function streakText(streak) {
  if (streak === 0) return 'No streak';
  if (streak > 0) return `🔥 ${streak}W Streak`;
  return `❄️ ${Math.abs(streak)}L Streak`;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function medal(index) {
  return ['🥇', '🥈', '🥉'][index] || `${index + 1}.`;
}

// ─── Command handlers ──────────────────────────────────────────────────────

/**
 * /lol add <gameName#tagLine>
 * Register a Riot account for the calling Discord user.
 */
async function handleAdd(message, args, { db, riotApi }) {
  const input = args.join(' ');

  if (!input || !input.includes('#')) {
    return message.reply({
      embeds: [errorEmbed('Usage: `/lol add GameName#TAG`\nExample: `/lol add Faker#T1`')],
    });
  }

  const [gameName, tagLine] = input.split('#');

  if (!gameName || !tagLine) {
    return message.reply({
      embeds: [errorEmbed('Could not parse the Riot ID. Use the format `GameName#TAG`.')],
    });
  }

  const statusMsg = await message.reply({ content: '🔍 Looking up your Riot account…' });

  try {
    const account = await riotApi.getPuuidByRiotId(gameName, tagLine);

    if (!account) {
      await statusMsg.edit({
        content: '',
        embeds: [
          errorEmbed(
            `Could not find **${gameName}#${tagLine}**. Check spelling and tag, then try again.`
          ),
        ],
      });
      return;
    }

    db.addUser(
      message.author.id,
      `${account.gameName}#${account.tagLine}`, // summoner_name for backwards compat
      account.puuid,
      account.gameName,
      account.tagLine
    );

    const embed = new EmbedBuilder()
      .setColor(COLOR.SUCCESS)
      .setTitle('Account Linked!')
      .setDescription(`Successfully linked **${account.gameName}#${account.tagLine}** to your Discord account.`)
      .addFields({ name: 'PUUID', value: `\`${account.puuid.slice(0, 16)}…\`` })
      .setFooter({ text: 'Use !stats to see your stats after the first sync.' })
      .setTimestamp();

    await statusMsg.edit({ content: '', embeds: [embed] });
  } catch (err) {
    console.error('[commands/add]', err);
    await statusMsg.edit({
      content: '',
      embeds: [errorEmbed('An unexpected error occurred. Please try again later.')],
    });
  }
}

/**
 * !stats [@user]
 * Show aggregated stats for a user.
 */
async function handleStats(message, args, { db, statsService }) {
  const target = message.mentions.users.first() || message.author;
  const user = db.getUser(target.id);

  if (!user || !user.puuid) {
    const hint = target.id === message.author.id
      ? 'Use `/lol add GameName#TAG` to link your Riot account first.'
      : `${target.username} hasn't linked a Riot account yet.`;
    return message.reply({ embeds: [errorEmbed(hint)] });
  }

  // Always recalculate from stored matches so stats are fresh
  const stats = statsService.calculateStats(user.puuid) || db.getStats(user.puuid);
  const favChamp = statsService.getFavoriteChampion(user.puuid);
  const streak = statsService.getWinLossStreak(user.puuid);
  const displayName = `${user.game_name}#${user.tag_line}`;

  const embed = new EmbedBuilder()
    .setColor(COLOR.INFO)
    .setTitle(`📊 Stats — ${displayName}`)
    .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${formatChampionName(favChamp) ?? 'Lux'}_0.jpg`)
    .setTimestamp();

  if (!stats) {
    embed
      .setColor(COLOR.WARNING)
      .setDescription('No match data yet. Stats will appear after the first sync (every 10 min).');
  } else {
    embed.addFields(
      { name: '⚔️ KDA', value: `**${stats.avg_kda.toFixed(2)}**`, inline: true },
      { name: '🏆 Winrate', value: `**${stats.winrate.toFixed(1)}%**`, inline: true },
      { name: '🌾 Avg CS', value: `**${stats.avg_cs.toFixed(1)}**`, inline: true },
      { name: '💥 Avg Damage', value: `**${Math.round(stats.avg_damage).toLocaleString()}**`, inline: true },
      { name: '🎯 Favorite Champion', value: `**${formatChampionName(favChamp) ?? 'Unknown'}**`, inline: true },
      { name: '📈 Current Streak', value: streakText(streak), inline: true }
    );
  }

  return message.reply({ embeds: [embed] });
}

/**
 * /lol last [@user]
 * Show the most recent match for a user.
 */
async function handleLast(message, args, { db }) {
  const target = message.mentions.users.first() || message.author;
  const user = db.getUser(target.id);

  if (!user || !user.puuid) {
    const hint = target.id === message.author.id
      ? 'Use `/lol add GameName#TAG` to link your Riot account first.'
      : `${target.username} hasn't linked a Riot account yet.`;
    return message.reply({ embeds: [errorEmbed(hint)] });
  }

  const match = db.getLastMatch(user.puuid);

  if (!match) {
    return message.reply({
      embeds: [
        infoEmbed(
          'No matches found',
          'No match data yet. Stats will appear after the first sync (every 10 min).'
        ),
      ],
    });
  }

  const displayName = `${user.game_name}#${user.tag_line}`;
  const result = match.win === 1 ? 'Victory' : 'Defeat';
  const color = match.win === 1 ? COLOR.WIN : COLOR.LOSS;
  const playedAt = match.timestamp
    ? `<t:${Math.floor(match.timestamp / 1000)}:R>`
    : 'Unknown';

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`${match.win === 1 ? '✅' : '❌'} Last Game — ${displayName}`)
    .setDescription(`**${result}** on **${formatChampionName(match.champion)}** • ${playedAt}`)
    .addFields(
      { name: 'Queue', value: `${await getQueueDescription(match.queue_id)}`, inline: true },
      { name: 'K/D/A', value: `**${match.kills}/${match.deaths}/${match.assists}**`, inline: true },
      { name: 'Damage', value: `**${(match.damage || 0).toLocaleString()}**`, inline: true },
      { name: 'CS', value: `**${match.cs}**`, inline: true },
      { name: 'Vision Score', value: `**${match.vision_score}**`, inline: true },
      { name: 'Duration', value: `**${formatDuration(match.game_duration)}**`, inline: true }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

/**
 * /lol top
 * Show server-wide rankings across all categories.
 */
async function handleTop(message, args, { statsService }) {
  const rankings = statsService.getRankings();

  const hasData = Object.values(rankings).some((arr) => arr.length > 0);

  if (!hasData) {
    return message.reply({
      embeds: [
        infoEmbed(
          'No data yet',
          'No users have linked their accounts or no matches have been synced yet.\nUse `/lol add GameName#TAG` to get started.'
        ),
      ],
    });
  }

  function top3(arr, formatter) {
    if (!arr || arr.length === 0) return '_No data_';
    return arr
      .slice(0, 3)
      .map((entry, i) => `${medal(i)} **${entry.user.game_name}#${entry.user.tag_line}** — ${formatter(entry.value)}`)
      .join('\n');
  }

  const embed = new EmbedBuilder()
    .setColor(COLOR.GOLD)
    .setTitle('🏆 Server Rankings')
    .setDescription('Top players across all tracked stats (last 100 games each)')
    .addFields(
      // ── Competitive categories ──
      {
        name: '⚔️ KDA Champions',
        value: top3(rankings.kda, (v) => `${v.toFixed(2)} KDA`),
        inline: false,
      },
      {
        name: '🏆 Winrate Warriors',
        value: top3(rankings.winrate, (v) => `${v.toFixed(1)}%`),
        inline: false,
      },
      {
        name: '🌟 Performance Stars',
        value: top3(rankings.performance, (v) => `${v.toFixed(2)} pts`),
        inline: false,
      },
      // ── Fun categories ──
      {
        name: '💀 Int Master',
        value: top3(rankings.intMaster, (v) => `${v} deaths`),
        inline: true,
      },
      {
        name: '🌾 Farmer 3000',
        value: top3(rankings.farmer, (v) => `${v.toFixed(1)} CS/game`),
        inline: true,
      },
      {
        name: '💥 Solo Carry',
        value: top3(rankings.soloCarry, (v) => `${Math.round(v).toLocaleString()} dmg`),
        inline: true,
      },
      {
        name: '👁️ Vision King',
        value: top3(rankings.visionKing, (v) => `${v.toFixed(1)} vision/game`),
        inline: true,
      },
      {
        name: '😤 Tilt Detector',
        value: top3(rankings.tiltDetector, (v) =>
          v < 0 ? `${Math.abs(v)}L streak` : v === 0 ? 'No streak' : `${v}W streak`
        ),
        inline: true,
      }
    )
    .setFooter({ text: 'Stats update automatically every 10 minutes' })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

// ─── Help command ──────────────────────────────────────────────────────────

async function handleHelp(message) {
  const embed = new EmbedBuilder()
    .setColor(COLOR.INFO)
    .setTitle('📖 LoL Bot — Command Reference')
    .addFields(
      { name: '`/lol add GameName#TAG`', value: 'Link your Riot account to your Discord profile.' },
      { name: '`/lol stats [@user]`', value: 'Show KDA, winrate, CS, damage, and favourite champion.' },
      { name: '`/lol last [@user]`', value: 'Show detailed stats for your most recent game.' },
      { name: '`/lol top`', value: 'Show server-wide leaderboards across all categories.' },
      { name: '`/lol help`', value: 'Show this help message.' }
    )
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

// ─── Main dispatcher ───────────────────────────────────────────────────────

/**
 * Route an incoming Discord message to the correct command handler.
 *
 * @param {import('discord.js').Message} message
 * @param {object} services  { db, riotApi, matchService, statsService }
 */
async function handleCommand(message, services) {
  const content = message.content.trim();

  if (!content.startsWith('/lol ')) return;

  const [rawCommand, ...args] = content.slice(5).trim().split(/\s+/);
  const command = rawCommand.toLowerCase();

  try {
    switch (command) {
      case 'add':
        await handleAdd(message, args, services);
        break;
      case 'stats':
        await handleStats(message, args, services);
        break;
      case 'last':
        await handleLast(message, args, services);
        break;
      case 'top':
        await handleTop(message, args, services);
        break;
      case 'help':
        await handleHelp(message);
        break;
      default:
        // Silently ignore unknown commands to avoid spamming
        break;
    }
  } catch (err) {
    console.error(`[commands] Unhandled error in /lol ${command}:`, err);
    try {
      await message.reply({
        embeds: [errorEmbed('An unexpected error occurred. Please try again later.')],
      });
    } catch {
      // Message may have been deleted, etc. — ignore
    }
  }
}

module.exports = { handleCommand };
