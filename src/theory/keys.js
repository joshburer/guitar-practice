import { parseNote, noteName, note, pc, mod } from './notes.js';
import { spell } from './intervals.js';
import { scaleById } from './scales.js';
import { chordById, chordOn, sameSet } from './chords.js';

// Tonics in circle-of-fifths order. Index i in MINOR is the relative minor of index i in MAJOR.
export const TONICS = {
  major: ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'D♭', 'A♭', 'E♭', 'B♭', 'F'],
  minor: ['A', 'E', 'B', 'F♯', 'C♯', 'G♯', 'E♭', 'B♭', 'F', 'C', 'G', 'D'],
};

export function makeKey(tonicName, mode = 'major') {
  const tonic = parseNote(tonicName);
  const scale = spell(tonic, scaleById(mode).formula);
  return { tonic, mode, name: `${noteName(tonic)} ${mode}`, scale };
}

// "3♯", "2♭" or "" for C major / A minor.
export function signature(key) {
  const sharps = key.scale.filter((t) => t.note.alter > 0).length;
  const flats = key.scale.filter((t) => t.note.alter < 0).length;
  return sharps ? `${sharps}♯` : flats ? `${flats}♭` : '';
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const SUFFIX = { maj: '', min: '', dim: '°', aug: '+', maj7: 'maj7', 7: '7', m7: '7', m7b5: 'ø7', dim7: '°7', m6: '6', m9: '9', mMaj7: '(maj7)' };

export function roman(degree, type, alter = 0) {
  const minorish = type.formula.some((iv) => iv.id === 'b3');
  const numeral = minorish ? NUMERALS[degree].toLowerCase() : NUMERALS[degree];
  return (alter < 0 ? '♭' : alter > 0 ? '♯' : '') + numeral + (SUFFIX[type.id] ?? type.symbol);
}

// The chord quality on each degree is not a lookup table: stack thirds from the scale and see what comes out.
const STACKABLE = ['maj', 'min', 'dim', 'aug', 'maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7'].map(chordById);

export function diatonic(key, sevenths = false) {
  return key.scale.map((tone, degree) => {
    const steps = sevenths ? [0, 2, 4, 6] : [0, 2, 4];
    const rel = new Set(steps.map((s) => mod(pc(key.scale[(degree + s) % 7].note) - pc(tone.note), 12)));
    const type = STACKABLE.find((t) => sameSet(rel, new Set(t.formula.map((iv) => iv.semitones))));
    return { ...chordOn(tone.note, type), degree, roman: roman(degree, type) };
  });
}

export function relative(key) {
  const i = TONICS[key.mode].indexOf(noteName(key.tonic));
  const other = key.mode === 'major' ? 'minor' : 'major';
  return makeKey(TONICS[other][i], other);
}

// A progression step is a scale degree (0–6, diatonic chord) or { deg, type, alter } for borrowed chords.
const step = (deg, type, alter = 0) => ({ deg, type, alter });

export const PROGRESSIONS = {
  major: [
    { title: 'Three-chord song', steps: [0, 3, 4] },
    { title: 'Pop axis', steps: [0, 4, 5, 3] },
    { title: 'Doo-wop', steps: [0, 5, 3, 4] },
    { title: 'Jazz ii–V–I', steps: [step(1, 'm7'), step(4, '7'), step(0, 'maj7')] },
    { title: 'Turnaround', steps: [step(0, 'maj7'), step(5, 'm7'), step(1, 'm7'), step(4, '7')] },
    // `form` is the order the steps are played in, one bar each: here the 12-bar blues.
    { title: 'Blues changes', steps: [step(0, '7'), step(3, '7'), step(4, '7')], form: [0, 0, 0, 0, 1, 1, 0, 0, 2, 1, 0, 2] },
    { title: 'Rock borrowed ♭VII', steps: [0, step(6, 'maj', -1), 3] },
  ],
  minor: [
    { title: 'Minor three-chord', steps: [0, 3, 4] },
    { title: 'Minor pop', steps: [0, 5, 2, 6] },
    { title: 'Andalusian cadence', steps: [0, 6, 5, step(4, 'maj')] },
    { title: 'Minor ii–V–i', steps: [step(1, 'm7b5'), step(4, '7'), step(0, 'm7')] },
  ],
};

export function resolveStep(key, s, sevenths = false) {
  if (typeof s === 'number') return diatonic(key, sevenths)[s];
  const base = key.scale[s.deg].note;
  const type = chordById(s.type);
  return { ...chordOn(note(base.letter, base.alter + s.alter), type), degree: s.deg, roman: roman(s.deg, type, s.alter) };
}
