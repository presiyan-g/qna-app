import seedrandom from 'seedrandom';

const SEED_PREFIX = 'quorum-seed-v1';

// Returns a deterministic RNG keyed by a stable string.
// Same key → identical sequence across runs.
export function makeRng(...keyParts) {
  return seedrandom(`${SEED_PREFIX}:${keyParts.join(':')}`);
}

// Helpers built on top of an RNG.
export function pickRandom(rng, items) {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle(rng, items) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function sampleSubset(rng, items, count) {
  return shuffle(rng, items).slice(0, count);
}
