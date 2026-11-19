// Monophonic pitch detection (the YIN method). Pure maths, no browser APIs: tested in tests/.
//
// Two looks at the sound, because a guitar asks for two different things. High notes are short, quiet and die
// fast, so they are read from the last few hundredths of a second at full resolution: quick to lock on, and the
// note before has already left the window. Low notes need a longer stretch to show even two or three periods.

const LOWEST = 70; // just under a drop-D sixth string
const HIGHEST = 1400; // the 24th fret of the first string
const SPLIT = 170; // Hz: above this the short window is enough

export const FRAME = 4096; // samples the tracker wants each time
export const HOP_MS = 25; // how often to feed it

// YIN's difference function: how unlike itself the signal is when shifted by each lag, normalised by the running
// mean so that a deep dip means "this lag is a period". Returns [dips, minLag, maxLag].
function difference(x, from, length, minLag, maxLag) {
  const window = length - maxLag;
  const diff = new Float32Array(maxLag + 2);
  let running = 0;
  diff[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = from; i < from + window; i++) {
      const d = x[i] - x[i + lag];
      sum += d * d;
    }
    running += sum;
    diff[lag] = running ? (sum * lag) / running : 1;
  }
  diff[maxLag + 1] = 1;
  return diff;
}

// The first lag that dips under the threshold is the period; later dips are its multiples (octave errors).
// In a noisy room no dip gets that deep, so the bar rises to just above the deepest one, within reason.
function period(diff, minLag, maxLag, threshold, loosest) {
  let bar = threshold;
  if (loosest > threshold) {
    let deepest = 1;
    for (let lag = minLag; lag <= maxLag; lag++) deepest = Math.min(deepest, diff[lag]);
    if (deepest > loosest) return null;
    bar = Math.max(threshold, deepest + 0.04);
  }
  let lag = minLag;
  while (lag <= maxLag && diff[lag] >= bar) lag++;
  if (lag > maxLag) return null;
  while (lag < maxLag && diff[lag + 1] < diff[lag]) lag++;
  if (lag >= maxLag) return null; // still falling at the edge: the real period is longer than this window sees

  // Refine between samples with a parabola through the dip.
  const a = diff[lag - 1];
  const b = diff[lag];
  const c = diff[lag + 1];
  const shift = a + c - 2 * b ? (a - c) / (2 * (a + c - 2 * b)) : 0;
  return lag + shift;
}

const rms = (x, from, to) => {
  let energy = 0;
  for (let i = from; i < to; i++) energy += x[i] * x[i];
  return Math.sqrt(energy / (to - from));
};

// Returns the fundamental in Hz, or null when the input is too quiet or has no clear pitch.
// `samples` are the most recent audio, newest last; 4096 of them is what the two windows are sized for.
export function detectPitch(samples, sampleRate, { threshold = 0.12, gate = 0.0025 } = {}) {
  const total = samples.length;

  // High notes: the newest ~32 ms at the full sample rate.
  const short = Math.min(total, Math.round(sampleRate * 0.032));
  const start = total - short;
  if (rms(samples, start, total) >= gate) {
    const minLag = Math.floor(sampleRate / HIGHEST);
    const maxLag = Math.min(Math.ceil(sampleRate / SPLIT), short >> 1);
    const lag = period(difference(samples, start, short, minLag, maxLag), minLag, maxLag, threshold, 0);
    if (lag) return sampleRate / lag;
  }

  // Everything else: the whole window at half the sample rate, which is plenty for low notes and four times cheaper.
  const n = total >> 1;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = (samples[2 * i] + samples[2 * i + 1]) / 2;
  if (rms(x, n >> 1, n) < gate) return null;
  const rate = sampleRate / 2;
  const minLag = Math.floor(rate / HIGHEST);
  const maxLag = Math.min(Math.floor(rate / LOWEST), n >> 1);
  const lag = period(difference(x, 0, n, minLag, maxLag), minLag, maxLag, threshold, 0.3);
  return lag ? rate / lag : null;
}

export const midiOf = (hz) => Math.round(69 + 12 * Math.log2(hz / 440));

// Turns a stream of frames into note events. Feed it the newest FRAME samples every HOP_MS; it returns a MIDI
// note when one settles, null when the string has stopped ringing, and undefined when there is nothing new.
// A note counts once two frames in a row agree. A fresh pick stroke reports the note again even at the same pitch.
export function noteTracker(sampleRate) {
  let candidate = null;
  let frames = 0;
  let reported = null;
  let level = 0;
  const tail = Math.round(sampleRate * 0.02);
  const quiet = Math.round(200 / HOP_MS); // silence must last, so a decaying string is not cut off
  return (samples) => {
    const now = rms(samples, samples.length - tail, samples.length);
    if (now > level * 1.8 && now > 0.004) reported = null;
    level = now;
    const hz = detectPitch(samples, sampleRate);
    const midi = hz ? midiOf(hz) : null;
    frames = midi === candidate ? frames + 1 : 1;
    candidate = midi;
    if (frames >= (midi == null ? quiet : 2) && midi !== reported) return (reported = midi);
    return undefined;
  };
}
