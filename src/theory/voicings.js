import { INTERVALS } from './intervals.js';
import { mod } from './notes.js';

// Voicings are generated, not looked up: any chord formula works in any tuning.
// A voicing is `frets`, one entry per string low to high, -1 for a muted string.

const sounding = (frets) => frets.map((f, s) => ({ f, s })).filter((x) => x.f >= 0);

// The barre a hand would use: several strings at the lowest fret with no open string above them.
export function barreOf(frets) {
  const fretted = sounding(frets).filter((x) => x.f > 0);
  if (!fretted.length) return null;
  const fret = Math.min(...fretted.map((x) => x.f));
  const at = fretted.filter((x) => x.f === fret);
  if (at.length < 2) return null;
  const from = at[0].s;
  if (frets.some((f, s) => s > from && f === 0)) return null;
  return { fret, from, to: at[at.length - 1].s, count: at.length };
}

export function fingersNeeded(frets) {
  const fretted = frets.filter((f) => f > 0).length;
  const barre = barreOf(frets);
  return barre ? fretted - barre.count + 1 : fretted;
}

export function voicings(tuning, rootPc, type, { maxFret = 15, limit = 10 } = {}) {
  const n = tuning.length;
  const tones = type.formula.map((iv) => mod(rootPc + iv.semitones, 12));
  const toneSet = new Set(tones);
  const optionalIds = type.optional ?? (tones.length >= 4 ? ['5'] : []);
  const optional = new Set(optionalIds.map((id) => mod(rootPc + INTERVALS[id].semitones, 12)));
  const required = tones.filter((t) => !optional.has(t));
  const maxStrings = type.maxStrings ?? n;
  const minStrings = Math.min(n, maxStrings, Math.max(4, required.length)); // three-string grips live in triadShapes
  const found = new Map();

  const consider = (frets, skipped) => {
    const notes = sounding(frets);
    if (notes.length < minStrings || notes.length > maxStrings) return;
    if (notes[0].f > 0 && notes[1].f === 0) return; // a fretted bass under an open string rarely sits well
    if (skipped >= 0 && notes[notes.length - 1].s < skipped) return;
    const pcs = new Set(notes.map((x) => mod(tuning[x.s] + x.f, 12)));
    if (!required.every((t) => pcs.has(t))) return;
    const fingers = fingersNeeded(frets);
    if (fingers > 4) return;
    const fretted = notes.filter((x) => x.f > 0).map((x) => x.f);
    const baseFret = fretted.length ? Math.min(...fretted) : 0;
    const span = fretted.length ? Math.max(...fretted) - baseFret : 0;
    const complete = tones.every((t) => pcs.has(t));
    const stretch = span === 3 ? 20 : span * 4; // a four-fret reach costs far more than a three-fret one
    const score = notes.length * 10 + (complete ? 5 : 0) - stretch - fingers * 3 - (skipped >= 0 ? 8 : 0);
    found.set(frets.join(','), { frets: [...frets], bass: notes[0].s, baseFret, span, fingers, complete, score });
  };

  // Slide a four-fret hand position up the neck and try every combination inside it.
  for (let w = 1; w + 3 <= maxFret; w++) {
    const choices = tuning.map((open) => {
      const c = [];
      if (w === 1 && toneSet.has(mod(open, 12))) c.push(0); // open strings belong to open position
      for (let f = w; f <= w + 3; f++) if (toneSet.has(mod(open + f, 12))) c.push(f);
      return c;
    });
    const extend = (s, frets, skipped) => {
      consider(frets, skipped);
      if (s >= n) return;
      for (const f of choices[s]) {
        frets[s] = f;
        extend(s + 1, frets, skipped);
      }
      frets[s] = -1;
      // Four-note chords may skip the string above the bass (the classic drop-3 grip).
      if (skipped < 0 && tones.length >= 4 && frets[s - 1] >= 0 && frets.slice(0, s - 1).every((f) => f < 0)) {
        extend(s + 1, frets, s);
      }
    };
    for (let lo = 0; lo <= n - minStrings; lo++) {
      for (const f of choices[lo]) {
        if (f >= 12 || mod(tuning[lo] + f, 12) !== rootPc) continue; // root in the bass
        const frets = Array(n).fill(-1);
        frets[lo] = f;
        extend(lo + 1, frets, -1);
      }
    }
  }

  // Keep the fullest grip of each shape, then the best one per bass string and position.
  const all = [...found.values()];
  const within = (a, b) => a !== b && a.bass === b.bass && a.frets.every((f, s) => f < 0 || f === b.frets[s]);
  const maximal = all.filter((a) => !all.some((b) => within(a, b)));
  const best = new Map();
  for (const v of maximal) {
    const key = `${v.bass}:${v.baseFret}`;
    if (!best.has(key) || best.get(key).score < v.score) best.set(key, v);
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .sort((a, b) => a.baseFret - b.baseFret || a.bass - b.bass);
}

// The grip to reach for first: an open-string chord if there is one, otherwise the easiest shape low on the neck.
// Pass a fret to get the grip closest to that position instead.
export function bestVoicing(grips, nearFret) {
  if (!grips.length) return null;
  if (nearFret != null) return grips.reduce((best, g) => (Math.abs(g.baseFret - nearFret) < Math.abs(best.baseFret - nearFret) ? g : best));
  const open = grips.filter((g) => g.frets.includes(0));
  const ease = (g) => g.score - (open.length ? 0 : g.baseFret * 3);
  return (open.length ? open : grips).reduce((best, g) => (ease(g) > ease(best) ? g : best));
}

// Close-position triads on three adjacent strings, one shape per inversion.
// `lo` is the lowest string of the set. Returns [{ frets, inversion }] with inversion 0 = root position.
export function triadShapes(tuning, rootPc, type, lo) {
  const tones = type.formula.map((iv) => mod(rootPc + iv.semitones, 12));
  return [0, 1, 2].map((inversion) => {
    const frets = Array(tuning.length).fill(-1);
    let pitch = tuning[lo] + mod(tones[inversion] - tuning[lo], 12);
    frets[lo] = pitch - tuning[lo];
    for (let i = 1; i < 3; i++) {
      pitch += mod(tones[(inversion + i) % 3] - pitch, 12) || 12;
      frets[lo + i] = pitch - tuning[lo + i];
    }
    const used = [lo, lo + 1, lo + 2];
    const min = Math.min(...used.map((s) => frets[s]));
    const shift = min < 0 ? 12 : min >= 12 ? -12 : 0;
    for (const s of used) frets[s] += shift;
    return { frets, inversion };
  });
}
