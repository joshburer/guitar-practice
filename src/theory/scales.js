import { formula, spell, bestRoot } from './intervals.js';
import { noteName } from './notes.js';

const scale = (id, name, group, text) => ({ id, name, group, formula: formula(text) });

// To add a scale, add a line. Every view and drill picks it up.
export const SCALES = [
  scale('minor-pentatonic', 'Minor pentatonic', 'Pentatonic', '1 b3 4 5 b7'),
  scale('major-pentatonic', 'Major pentatonic', 'Pentatonic', '1 2 3 5 6'),
  scale('blues', 'Blues', 'Pentatonic', '1 b3 4 b5 5 b7'),
  scale('major', 'Major', 'Major & minor', '1 2 3 4 5 6 7'),
  scale('minor', 'Natural minor', 'Major & minor', '1 2 b3 4 5 b6 b7'),
  scale('harmonic-minor', 'Harmonic minor', 'Major & minor', '1 2 b3 4 5 b6 7'),
  scale('melodic-minor', 'Melodic minor', 'Major & minor', '1 2 b3 4 5 6 7'),
  scale('dorian', 'Dorian', 'Modes', '1 2 b3 4 5 6 b7'),
  scale('phrygian', 'Phrygian', 'Modes', '1 b2 b3 4 5 b6 b7'),
  scale('lydian', 'Lydian', 'Modes', '1 2 3 #4 5 6 7'),
  scale('mixolydian', 'Mixolydian', 'Modes', '1 2 3 4 5 6 b7'),
  scale('locrian', 'Locrian', 'Modes', '1 b2 b3 4 b5 b6 b7'),
];

export const scaleById = (id) => SCALES.find((s) => s.id === id);

export function spellScale(p, type) {
  const root = bestRoot(p, type.formula);
  return { root, type, name: `${noteName(root)} ${type.name.toLowerCase()}`, tones: spell(root, type.formula) };
}
