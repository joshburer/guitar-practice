// Notes are spelled pitches: a letter (0–6 = C…B) plus an alteration in semitones.
// A pitch class ("pc") is 0–11 with C = 0. Everything else in the app is derived from these.

export const LETTERS = 'CDEFGAB';
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];

export const mod = (n, m) => ((n % m) + m) % m;

export const note = (letter, alter = 0) => ({ letter, alter });

export function parseNote(text) {
  const letter = LETTERS.indexOf(text[0].toUpperCase());
  if (letter < 0) throw new Error(`Not a note: ${text}`);
  let alter = 0;
  for (const ch of text.slice(1)) {
    if (ch === '#' || ch === '♯') alter++;
    else if (ch === 'b' || ch === '♭') alter--;
  }
  return note(letter, alter);
}

export const pc = (n) => mod(LETTER_PC[n.letter] + n.alter, 12);

export function noteName(n) {
  return LETTERS[n.letter] + (n.alter > 0 ? '♯'.repeat(n.alter) : '♭'.repeat(-n.alter));
}

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(parseNote);
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'].map(parseNote);

export const fromPc = (p, prefer = 'sharp') => (prefer === 'flat' ? FLAT : SHARP)[mod(p, 12)];

export const isNatural = (p) => SHARP[mod(p, 12)].alter === 0;

// style: 'sharp' | 'flat' | 'both' ("C♯/D♭")
export function pcName(p, style = 'both') {
  const sharp = noteName(fromPc(p, 'sharp'));
  const flat = noteName(fromPc(p, 'flat'));
  if (sharp === flat) return sharp;
  return style === 'sharp' ? sharp : style === 'flat' ? flat : `${sharp}/${flat}`;
}

// Move a note by an interval, keeping the spelling correct (C up a ♭3 is E♭, never D♯).
export function transpose(n, { degree, semitones }) {
  const letter = mod(n.letter + degree - 1, 7);
  const alter = mod(pc(n) + semitones - LETTER_PC[letter] + 6, 12) - 6;
  return note(letter, alter);
}

// Double sharps and flats are correct on paper and useless on a fretboard: respell them.
export function simplify(n) {
  return Math.abs(n.alter) < 2 ? n : fromPc(pc(n), n.alter > 0 ? 'sharp' : 'flat');
}
