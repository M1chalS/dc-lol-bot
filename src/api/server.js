'use strict';

require('dotenv').config();

const express = require('express');
const db = require('../db/database');
const statsService = require('../services/statsService');

const app = express();
const PORT = process.env.API_PORT || 3001;

app.get('/api/users', (req, res) => {
  const users = db.getAllUsers();
  const result = users.map((user) => {
    const stats = db.getStats(user.puuid) || {};
    const favoriteChampion = statsService.getFavoriteChampion(user.puuid);
    return { ...user, stats, favoriteChampion };
  });
  res.json(result);
});

app.get('/api/stats/:discordId', (req, res) => {
  const user = db.getUser(req.params.discordId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const stats = db.getStats(user.puuid) || {};
  const matches = db.getMatchesByPuuid(user.puuid, 20);
  const favoriteChampion = statsService.getFavoriteChampion(user.puuid);
  const streak = statsService.getWinLossStreak(user.puuid);

  res.json({ user, stats, favoriteChampion, streak, recentMatches: matches });
});

app.get('/api/last/:discordId', (req, res) => {
  const user = db.getUser(req.params.discordId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const match = db.getLastMatch(user.puuid);
  if (!match) return res.status(404).json({ error: 'No matches found' });

  res.json({ user, match });
});

app.get('/api/top', (req, res) => {
  const rankings = statsService.getRankings();
  res.json(rankings);
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
