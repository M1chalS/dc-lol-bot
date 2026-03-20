const whitelist = {
  "FiddleSticks": "Fiddlesticks",
  "KhaZix": "Kha'Zix",
  "RekSai": "Rek'Sai",
}

/**
 * Insert a space before each uppercase letter that follows a lowercase letter.
 * "MissFortune" → "Miss Fortune", "TwistedFate" → "Twisted Fate"
 */
export function formatChampionName(name) {
  if (!name) return name;

  if (whitelist[name]) {
    return whitelist[name];
  }

  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}