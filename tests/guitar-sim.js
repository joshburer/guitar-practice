// A strummed guitar for tests: one Karplus–Strong string per note (the same model the app's synth plays),
// a few milliseconds apart like a real strum, slightly detuned, with some room noise.
export function strumSamples(midis, { rate = 48000, length = 16384, start = 0.12, detune = 0.08, noise = 0.004, seed = 1 } = {}) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const total = Math.floor(rate * start) + length;
  const out = new Float64Array(total);
  midis.forEach((midi, n) => {
    const cents = rand() * detune;
    const freq = 440 * 2 ** ((midi + cents - 69) / 12);
    const period = Math.max(2, Math.round(rate / freq - 0.5));
    const offset = Math.floor(n * 0.012 * rate);
    const d = new Float64Array(total - offset);
    for (let i = 0; i < period; i++) d[i] = rand();
    for (let pass = 0; pass < 2; pass++) for (let i = 1; i < period; i++) d[i] = (d[i] + d[i - 1]) / 2;
    for (let i = period + 1; i < d.length; i++) d[i] = 0.4985 * (d[i - period] + d[i - period - 1]);
    for (let i = 0; i < d.length; i++) out[i + offset] += d[i] * 0.15;
  });
  const from = Math.floor(rate * start);
  return Float32Array.from({ length }, (_, i) => out[from + i] + rand() * noise);
}

// A brighter, harsher string: additive partials falling off as 1/k, each decaying faster than the last, slightly
// stretched (real strings are a little inharmonic). Harder for a chord detector than the Karplus–Strong model.
export function brightStrum(midis, { rate = 44100, length = 16384, start = 0.12, noise = 0.006, seed = 1 } = {}) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647) * 2 - 1;
  const out = new Float32Array(length);
  midis.forEach((midi, n) => {
    const hz = 440 * 2 ** ((midi + rand() * 0.1 - 69) / 12);
    const t0 = start - n * 0.012;
    const phase = rand() * Math.PI;
    for (let k = 1; k <= 12; k++) {
      const f = hz * k * Math.sqrt(1 + 0.0001 * k * k);
      if (f > rate / 2) break;
      for (let i = 0; i < length; i++) {
        const t = t0 + i / rate;
        out[i] += (0.12 / k) * Math.sin(2 * Math.PI * f * t + phase * k) * Math.exp(-t * (1 + k * 0.8));
      }
    }
  });
  for (let i = 0; i < length; i++) out[i] += rand() * noise;
  return out;
}
