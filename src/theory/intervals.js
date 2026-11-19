import { transpose, simplify, fromPc } from './notes.js';

// An interval is a scale degree plus a size in semitones. Ids read like chord formulas: 'b3', '#11'.
const ROLE = { 1: 'root', 3: 'third', 5: 'fifth', 7: 'seventh', 8: 'root' };

function make([id, semitones, name]) {
  const degree = parseInt(id.replace(/[b#]/g, ''), 10);
  const label = id === '1' ? 'R' : id === 'bb7' ? '°7' : id.replace(/b/g, '♭').replace(/#/g, '♯');
  return { id, semitones, degree, name, label, role: ROLE[degree] ?? 'tone' };
}

export const INTERVALS = Object.fromEntries(
  [
    ['1', 0, 'Root'],
    ['b2', 1, 'Minor 2nd'],
    ['2', 2, 'Major 2nd'],
    ['b3', 3, 'Minor 3rd'],
    ['3', 4, 'Major 3rd'],
    ['4', 5, 'Perfect 4th'],
    ['#4', 6, 'Augmented 4th'],
    ['b5', 6, 'Tritone'],
    ['5', 7, 'Perfect 5th'],
    ['#5', 8, 'Augmented 5th'],
    ['b6', 8, 'Minor 6th'],
    ['6', 9, 'Major 6th'],
    ['bb7', 9, 'Diminished 7th'],
    ['b7', 10, 'Minor 7th'],
    ['7', 11, 'Major 7th'],
    ['8', 12, 'Octave'],
    ['b9', 13, 'Flat 9th'],
    ['9', 14, '9th'],
    ['#9', 15, 'Sharp 9th'],
    ['11', 17, '11th'],
    ['#11', 18, 'Sharp 11th'],
    ['b13', 20, 'Flat 13th'],
    ['13', 21, '13th'],
  ].map((row) => [row[0], make(row)]),
);

// The twelve intervals inside an octave, in the spelling players say out loud.
export const SIMPLE_INTERVALS = ['b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7', '8'];

export const formula = (text) => text.split(' ').map((id) => INTERVALS[id]);

// Spell a formula from a root note: [{ interval, note }]
export function spell(root, intervals) {
  return intervals.map((interval) => ({ interval, note: simplify(transpose(root, interval)) }));
}

// Pick the root spelling (C♯ or D♭?) that gives the formula the fewest accidentals.
export function bestRoot(p, intervals) {
  const cost = (root) => intervals.reduce((sum, iv) => sum + Math.abs(transpose(root, iv).alter), 0);
  const sharp = fromPc(p, 'sharp');
  const flat = fromPc(p, 'flat');
  const diff = cost(sharp) - cost(flat);
  if (diff !== 0) return diff < 0 ? sharp : flat;
  return p === 6 ? sharp : flat; // ties: F♯ by convention, flats otherwise
}
