import { load, save } from './store.js';

// Each drill keeps a deck of items. An item climbs a box per correct answer and drops to 0 on a miss.
// Low boxes are asked far more often, so practice time goes where the mistakes are.
const WEIGHT = [8, 4, 2, 1, 0.5];
const UNSEEN = 3;

const stats = load('stats', {});

export const statOf = (deck, key) => stats[deck]?.[key];

const today = () => new Date().toLocaleDateString('en-CA');

export function record(deck, key, correct) {
  const item = ((stats[deck] ??= {})[key] ??= { n: 0, c: 0, box: 0 });
  item.n++;
  if (correct) {
    item.c++;
    item.box = Math.min(WEIGHT.length - 1, item.box + 1);
  } else {
    item.box = 0;
  }
  save('stats', stats);
  const days = load('days', {});
  days[today()] = (days[today()] ?? 0) + 1;
  save('days', days);
}

export function pick(deck, keys, avoid) {
  const pool = keys.length > 1 ? keys.filter((k) => k !== avoid) : keys;
  const weights = pool.map((k) => {
    const item = statOf(deck, k);
    return item ? WEIGHT[item.box] : UNSEEN;
  });
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) if ((r -= weights[i]) <= 0) return pool[i];
  return pool[pool.length - 1];
}

// 0–1: how much of a deck sits in the top boxes.
export function mastery(deck, keys) {
  if (!keys.length) return 0;
  return keys.reduce((sum, k) => sum + Math.min(statOf(deck, k)?.box ?? 0, 3), 0) / (keys.length * 3);
}

export const answeredToday = () => load('days', {})[today()] ?? 0;

// Seconds spent in the play-along modes, per day.
export function logPlay(seconds) {
  if (!(seconds > 0)) return;
  const log = load('playtime', {});
  log[today()] = (log[today()] ?? 0) + seconds;
  save('playtime', log);
}

export const playedToday = () => load('playtime', {})[today()] ?? 0;

export function resetProgress() {
  for (const deck of Object.keys(stats)) delete stats[deck];
  save('stats', stats);
  save('days', {});
  save('playtime', {});
}
