import { formula, spell, bestRoot, INTERVALS } from './intervals.js';
import { noteName, pc, mod, pcName } from './notes.js';

const chord = (id, symbol, name, group, text, extra = {}) => ({
  id,
  symbol,
  name,
  group,
  short: symbol || 'major',
  formula: formula(text),
  ...extra,
});

// Ordered by how common the chord is: `identify` uses that order to break ties.
// `optional` lists tones a guitarist may leave out of a voicing (default: the 5th of any 4+ note chord).
export const CHORDS = [
  chord('maj', '', 'Major', 'Triads', '1 3 5'),
  chord('min', 'm', 'Minor', 'Triads', '1 b3 5', { short: 'minor' }),
  chord('7', '7', 'Dominant 7th', 'Sevenths', '1 3 5 b7'),
  chord('maj7', 'maj7', 'Major 7th', 'Sevenths', '1 3 5 7'),
  chord('m7', 'm7', 'Minor 7th', 'Sevenths', '1 b3 5 b7'),
  chord('sus4', 'sus4', 'Suspended 4th', 'Triads', '1 4 5'),
  chord('sus2', 'sus2', 'Suspended 2nd', 'Triads', '1 2 5'),
  chord('dim', '°', 'Diminished', 'Triads', '1 b3 b5', { short: 'dim' }),
  chord('aug', '+', 'Augmented', 'Triads', '1 3 #5', { short: 'aug' }),
  chord('5', '5', 'Power chord', 'Triads', '1 5', { maxStrings: 3 }),
  chord('m7b5', 'm7♭5', 'Half-diminished', 'Sevenths', '1 b3 b5 b7'),
  chord('dim7', '°7', 'Diminished 7th', 'Sevenths', '1 b3 b5 bb7'),
  chord('6', '6', 'Major 6th', 'Sixths & adds', '1 3 5 6'),
  chord('m6', 'm6', 'Minor 6th', 'Sixths & adds', '1 b3 5 6'),
  chord('add9', 'add9', 'Add 9', 'Sixths & adds', '1 3 5 9'),
  chord('7sus4', '7sus4', 'Dominant 7 sus4', 'Sevenths', '1 4 5 b7'),
  chord('mMaj7', 'm(maj7)', 'Minor major 7th', 'Sevenths', '1 b3 5 7'),
  chord('9', '9', 'Dominant 9th', 'Extended', '1 3 5 b7 9'),
  chord('maj9', 'maj9', 'Major 9th', 'Extended', '1 3 5 7 9'),
  chord('m9', 'm9', 'Minor 9th', 'Extended', '1 b3 5 b7 9'),
  chord('7#9', '7♯9', 'Dominant 7 sharp 9', 'Extended', '1 3 5 b7 #9'),
  chord('7b9', '7♭9', 'Dominant 7 flat 9', 'Extended', '1 3 5 b7 b9'),
  chord('13', '13', 'Dominant 13th', 'Extended', '1 3 5 b7 9 13', { optional: ['5', '9'] }),
];

export const chordById = (id) => CHORDS.find((c) => c.id === id);

// Build a chord on a spelled root: { root, type, name, tones: [{ interval, note }], pcs: Set }
export function chordOn(root, type) {
  const tones = spell(root, type.formula);
  return { root, type, name: noteName(root) + type.symbol, tones, pcs: new Set(tones.map((t) => pc(t.note))) };
}

// Build a chord from a bare pitch class, choosing the friendliest root spelling.
export const spellChord = (p, type) => chordOn(bestRoot(p, type.formula), type);

export const sameSet = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// Name the chord a set of pitch classes makes. Returns candidates, best first.
// The bass note decides between equals: C E G A over C is C6, over A it is Am7.
export function identify(pcs, bassPc) {
  const set = [...new Set(pcs.map((p) => mod(p, 12)))];
  if (set.length < 3) return [];
  const found = [];
  for (const rootPc of set) {
    const rel = new Set(set.map((p) => mod(p - rootPc, 12)));
    CHORDS.forEach((type, rank) => {
      const full = new Set(type.formula.map((iv) => iv.semitones % 12));
      const exact = sameSet(rel, full);
      // Guitarists drop the 5th from four-note chords all the time: still the same chord.
      const noFifth = full.size >= 4 && full.has(7) && !rel.has(7) && rel.size === full.size - 1 && [...rel].every((x) => full.has(x));
      if (!exact && !noFifth) return;
      const score = (exact ? 100 : 70) + (rootPc === bassPc ? 25 : 0) - rank * 0.5;
      const ch = spellChord(rootPc, type);
      const bass = ch.tones.find((t) => pc(t.note) === bassPc);
      const slash = rootPc === bassPc ? '' : `/${bass ? noteName(bass.note) : pcName(bassPc, 'flat')}`;
      found.push({ ...ch, name: ch.name + slash, score, noFifth: !exact });
    });
  }
  return found.sort((a, b) => b.score - a.score);
}

// Name the interval between two pitch classes, low to high.
export function intervalBetween(lowPc, highPc) {
  const semis = mod(highPc - lowPc, 12);
  return Object.values(INTERVALS).find((iv) => iv.semitones === semis && !iv.id.includes('#') && iv.id !== 'bb7');
}
