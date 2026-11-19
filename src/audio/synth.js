import { settings } from '../state/settings.js';

// A plucked string (Karplus–Strong): a burst of noise fed through a short, damped delay line.
let ctx;
const buffers = new Map();

function context() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function stringBuffer(c, midi) {
  if (buffers.has(midi)) return buffers.get(midi);
  const rate = c.sampleRate;
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const period = Math.max(2, Math.round(rate / freq - 0.5));
  const length = Math.floor(rate * 2.4);
  const buffer = c.createBuffer(1, length, rate);
  const d = buffer.getChannelData(0);
  for (let i = 0; i < period; i++) d[i] = Math.random() * 2 - 1;
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < period; i++) d[i] = (d[i] + d[i - 1]) / 2; // soften the pick
  for (let i = period + 1; i < length; i++) d[i] = 0.4985 * (d[i - period] + d[i - period - 1]);
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(d[i]));
  const fade = rate * 0.05;
  for (let i = 0; i < length; i++) d[i] = (d[i] / peak) * Math.min(1, (length - i) / fade);
  buffers.set(midi, buffer);
  return buffer;
}

// Shared with the microphone listener so input and output run on one clock.
export const audioContext = context;

// Call from a tap so the browser lets audio start.
export const unlock = () => void context();

// The audio clock in seconds. Schedule against this (the `at` option) for sample-accurate timing.
export const audioNow = () => context()?.currentTime ?? performance.now() / 1000;

export function pluck(midi, delay = 0, { gain = 0.5, force = false, at } = {}) {
  if (!settings.sound && !force) return;
  const c = context();
  if (!c) return;
  const source = c.createBufferSource();
  const amp = c.createGain();
  source.buffer = stringBuffer(c, midi);
  amp.gain.value = gain;
  source.connect(amp).connect(c.destination);
  source.start((at ?? c.currentTime) + delay);
}

export const strum = (midis, delay = 0, opts = {}) => midis.forEach((m, i) => pluck(m, delay + i * 0.035, { gain: 0.32, ...opts }));

export const run = (midis, gap = 0.26) => midis.forEach((m, i) => pluck(m, i * gap));

// Metronome click at an audio-clock time; the downbeat is higher and louder.
export function click(at, accent = false) {
  if (!settings.sound) return;
  const c = context();
  if (!c) return;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.frequency.value = accent ? 1568 : 1047;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(accent ? 0.45 : 0.25, at + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
  osc.connect(amp).connect(c.destination);
  osc.start(at);
  osc.stop(at + 0.08);
}
