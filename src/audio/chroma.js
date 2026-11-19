import { CHORDS } from '../theory/chords.js';

// Polyphonic listening for strummed chords: which pitch classes are ringing, and how loudly.
// Pure maths, no browser APIs: tested in tests/. The single-note detector (pitch.js) cannot hear chords, since a
// chord has no one period; instead this looks at the spectrum, finds the partials, discounts the overtones that
// belong to a lower string, and folds what is left into twelve pitch classes (a "chroma").

const LOWEST = 72; // just under a drop-D sixth string
const HIGHEST = 1000; // a chord's fundamentals sit below this; the metronome click (C6, G6) sits above it
const OVERTONES = [2, 3, 4, 5, 6, 7, 8]; // partial numbers checked against each lower peak
const OVERTONE_SHARE = 1.5; // how loud a k-th overtone may be, as a share of its fundamental times 1/k
const POWER = 0.3; // compress loudness, so one ringing string cannot drown the rest

// In-place radix-2 FFT. `re` and `im` have the same power-of-two length.
export function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const step = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < size / 2; k++) {
        const wr = Math.cos(step * k);
        const wi = Math.sin(step * k);
        const a = start + k;
        const b = a + size / 2;
        const tr = re[b] * wr - im[b] * wi;
        const ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

// The partials in a block of samples: [{ hz, mag }], low to high. `samples.length` must be a power of two.
export function peaks(samples, sampleRate) {
  const n = samples.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = samples[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))); // Hann window
  fft(re, im);
  const top = Math.min(n / 2 - 2, Math.ceil((HIGHEST * 1.03 * n) / sampleRate));
  const mag = new Float64Array(top + 2);
  let loudest = 0;
  for (let i = 1; i <= top + 1; i++) {
    mag[i] = Math.hypot(re[i], im[i]);
    if (i <= top) loudest = Math.max(loudest, mag[i]);
  }
  const found = [];
  for (let i = 2; i <= top; i++) {
    const m = mag[i];
    if (m < loudest * 0.04 || m < mag[i - 1] || m <= mag[i + 1]) continue;
    // Refine between bins with a parabola through the log magnitudes.
    const a = Math.log(mag[i - 1] + 1e-12);
    const b = Math.log(m);
    const c = Math.log(mag[i + 1] + 1e-12);
    const shift = a + c - 2 * b ? (a - c) / (2 * (a + c - 2 * b)) : 0;
    const hz = ((i + shift) * sampleRate) / n;
    if (hz >= LOWEST && hz <= HIGHEST) found.push({ hz, mag: m });
  }
  return found;
}

// What is ringing: { chroma: twelve weights with the loudest at 1, bass: pitch class of the lowest note, level }.
// Returns null when the block is too quiet to judge.
export function chromaOf(samples, sampleRate, { gate = 0.006 } = {}) {
  let energy = 0;
  for (let i = 0; i < samples.length; i++) energy += samples[i] * samples[i];
  const level = Math.sqrt(energy / samples.length);
  if (level < gate) return null;

  const list = peaks(samples, sampleRate);
  if (!list.length) return null;
  const chroma = new Array(12).fill(0);
  let bass = null;
  const loudest = Math.max(...list.map((p) => p.mag));

  list.forEach((p, i) => {
    // A peak on an overtone of a lower note is partly that string's overtone, not a new note. Overtones 3, 5 and 7
    // would otherwise add a 5th, a major 3rd and a ♭7 nobody played. Take off what the lower note would explain and
    // keep the rest: a maj7 on top of a chord can sit exactly on the 3rd's third overtone, and must still count.
    let weight = 1;
    for (let j = 0; j < i; j++) {
      const q = list[j];
      const k = OVERTONES.find((k) => Math.abs(p.hz / (q.hz * k) - 1) < 0.012);
      if (!k) continue;
      const left = Math.max(0, 1 - (q.mag * OVERTONE_SHARE) / (k * p.mag));
      weight = Math.min(weight, k === 2 || k === 4 || k === 8 ? 0.5 + left / 2 : Math.max(0.1, left));
    }
    const midi = 69 + 12 * Math.log2(p.hz / 440);
    const off = Math.abs(midi - Math.round(midi));
    if (off > 0.4) return; // between notes: noise or a badly out-of-tune string
    const pcNow = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pcNow] += (p.mag / loudest) ** POWER * weight * (1 - off);
    if (bass == null && weight > 0.9 && p.mag > loudest * 0.15) bass = pcNow;
  });

  const top = Math.max(...chroma);
  if (!top) return null;
  return { chroma: chroma.map((v) => v / top), bass, level };
}

// Blend a new reading into a running one, so a single noisy frame does not decide anything.
export function blend(running, frame, keep = 0.5) {
  if (!running) return { ...frame, chroma: [...frame.chroma] };
  const chroma = running.chroma.map((v, i) => v * keep + frame.chroma[i] * (1 - keep));
  const top = Math.max(...chroma);
  return { chroma: chroma.map((v) => v / top), bass: frame.bass ?? running.bass, level: frame.level };
}

export const HEARD = 0.28; // a pitch class at least this strong (loudest = 1) counts as played
const FAINT = 0.12; // a chord tone weaker than this was not played at all
const STRAY = 0.5; // a note outside the chord this strong is worth pointing out

// Every chord a reading could be, best fit first: [{ root, type, score }]. The fit is the cosine between the
// reading and the chord's tones, plus a little for the right bass note and for being a common chord. Comparing
// fits, rather than testing each note against a fixed level, is what keeps leftover overtones from failing a chord.
export function fits(reading, types = CHORDS) {
  const norm = Math.hypot(...reading.chroma) || 1;
  const list = [];
  types.forEach((type, rank) => {
    const steps = [...new Set(type.formula.map((iv) => iv.semitones % 12))];
    for (let root = 0; root < 12; root++) {
      const dot = steps.reduce((sum, s) => sum + reading.chroma[(root + s) % 12], 0);
      const score = dot / (Math.sqrt(steps.length) * norm) + (reading.bass === root ? 0.05 : 0) - rank * 0.003;
      list.push({ root, type, score });
    }
  });
  return list.sort((a, b) => b.score - a.score);
}

const LOUD = 0.8; // a note outside the chord this strong was played, not an overtone
const MARGIN = 0.03; // how close to the best fit the wanted chord must come

// Check a reading against the chord that was asked for.
//   root: its pitch class; type: a chord type from theory/chords.js
// Returns { clean, best: the best-fitting chord { root, type }, missing: [pc], extra: [pc] }.
export function judgeChord(reading, root, type) {
  const steps = type.formula.map((iv) => iv.semitones % 12);
  const want = new Set(steps.map((s) => (root + s) % 12));
  const optional = new Set(steps.length >= 4 && steps.includes(7) ? [(root + 7) % 12] : []);
  const all = fits(reading, CHORDS.includes(type) ? CHORDS : [...CHORDS, type]);
  const mine = all.find((f) => f.root === root && f.type === type);
  const missing = [...want].filter((p) => !optional.has(p) && reading.chroma[p] < HEARD);
  const extra = reading.chroma.map((v, p) => (v >= STRAY && !want.has(p) ? p : -1)).filter((p) => p >= 0);
  const absent = [...want].some((p) => !optional.has(p) && reading.chroma[p] < FAINT);
  // A loud note on top of the chord (a 7th on a plain triad) fails it even when the fit is close.
  const loud = reading.chroma.some((v, p) => v >= LOUD && !want.has(p));
  const clean = !absent && !loud && mine.score >= all[0].score - MARGIN;
  return { clean, best: clean ? mine : all[0], missing: clean ? [] : missing, extra: clean ? [] : extra };
}
