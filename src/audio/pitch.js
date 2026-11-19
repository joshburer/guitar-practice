// Monophonic pitch detection (the YIN method). Pure maths, no browser APIs: tested in tests/.
// Returns the fundamental in Hz, or null when the input is too quiet or has no clear pitch.

const LOWEST = 70; // just under a drop-D sixth string
const HIGHEST = 1200; // above the 19th fret of the first string

export function detectPitch(samples, sampleRate, { threshold = 0.12, gate = 0.008 } = {}) {
  // Guitar fundamentals are low, so half the sample rate is plenty and four times cheaper.
  const n = samples.length >> 1;
  const x = new Float32Array(n);
  let energy = 0;
  for (let i = 0; i < n; i++) {
    x[i] = (samples[2 * i] + samples[2 * i + 1]) / 2;
    energy += x[i] * x[i];
  }
  if (Math.sqrt(energy / n) < gate) return null;

  const rate = sampleRate / 2;
  const minLag = Math.floor(rate / HIGHEST);
  const maxLag = Math.min(Math.floor(rate / LOWEST), n >> 1);
  const window = n - maxLag;

  // How different the signal is from itself shifted by each lag, normalised by the running mean.
  const diff = new Float32Array(maxLag + 1);
  let running = 0;
  diff[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < window; i++) {
      const d = x[i] - x[i + lag];
      sum += d * d;
    }
    running += sum;
    diff[lag] = running ? (sum * lag) / running : 1;
  }

  // The first lag that dips under the threshold is the period; later dips are its multiples (octave errors).
  let lag = minLag;
  while (lag <= maxLag && diff[lag] >= threshold) lag++;
  if (lag > maxLag) return null;
  while (lag < maxLag && diff[lag + 1] < diff[lag]) lag++;

  // Refine between samples with a parabola through the dip.
  const a = diff[lag - 1] ?? diff[lag];
  const b = diff[lag];
  const c = diff[lag + 1] ?? diff[lag];
  const shift = a + c - 2 * b ? (a - c) / (2 * (a + c - 2 * b)) : 0;
  return rate / (lag + shift);
}

export const midiOf = (hz) => Math.round(69 + 12 * Math.log2(hz / 440));
