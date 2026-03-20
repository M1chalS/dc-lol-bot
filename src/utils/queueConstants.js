'use strict';

const axios = require('axios');

const QUEUES_URL = 'https://static.developer.riotgames.com/docs/lol/queues.json';

let cache = null;

async function fetchQueueConstants() {
  if (cache) return cache;

  const { data } = await axios.get(QUEUES_URL);

  cache = data.map((entry) => {
    let desc = null;

    if (entry.description) {
      const parts = entry.description.split(' ');
      desc = parts.length > 3 ? `${parts[1]} ${parts[2]}` : entry.description;
    }

    return {
      queueId: entry.queueId,
      map: entry.map,
      description: desc,
    };
  });

  return cache;
}

async function getQueueDescription(queueId) {
  const constants = await fetchQueueConstants();
  const match = constants.find((q) => q.queueId === queueId);
  return match?.description ?? String(queueId);
}

module.exports = { fetchQueueConstants, getQueueDescription };