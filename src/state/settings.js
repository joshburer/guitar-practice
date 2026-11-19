import { load, save } from './store.js';
import { tuningById } from '../theory/index.js';

const DEFAULTS = {
  tuning: 'standard',
  lefty: false,
  accidentals: 'both', // 'sharp' | 'flat' | 'both'
  sound: true,
  labels: 'degrees', // what dots on the neck say: 'degrees' | 'notes'
};

export const settings = { ...DEFAULTS, ...load('settings', {}) };

const listeners = new Set();
export const onSettings = (fn) => listeners.add(fn);

export function setSetting(key, value) {
  settings[key] = value;
  save('settings', settings);
  listeners.forEach((fn) => fn());
}

// What drills and views need to know about the player's setup.
export const env = () => ({
  tuning: tuningById(settings.tuning),
  lefty: settings.lefty,
  accidentals: settings.accidentals,
  labels: settings.labels,
});
