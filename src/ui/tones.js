import { h } from './dom.js';
import { pc, pcAt, noteName } from '../theory/index.js';
import { pluck } from '../audio/synth.js';

// Helpers that turn spelled tones ([{ interval, note }]) into things to draw and play.

export const ROOT_LABELS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

const labelOf = (tone, labels) => (labels === 'notes' ? noteName(tone.note) : tone.interval.label);

// (string, fret) => { label, role } for one position, or {} when it is not one of the tones.
export function toneInfo(tuning, tones, labels = 'degrees') {
  const byPc = new Map(tones.map((t) => [pc(t.note), t]));
  return (string, fret) => {
    const tone = byPc.get(pcAt(tuning, string, fret));
    return tone ? { label: labelOf(tone, labels), role: tone.interval.role } : {};
  };
}

// Every position of the tones in a fret window, as Fretboard dots.
export function toneDots(tuning, tones, { from = 0, to = 12, labels = 'degrees', role, blank = false } = {}) {
  const info = toneInfo(tuning, tones, labels);
  const dots = [];
  tuning.forEach((_, string) => {
    for (let fret = from; fret <= to; fret++) {
      const dot = info(string, fret);
      if (dot.role) dots.push({ string, fret, label: blank ? '' : dot.label, role: role ?? dot.role });
    }
  });
  return dots;
}

// A chord inside its key: the scale as faint dots, the chord's tones lit up on top.
// Chord tones from outside the key (the ♭7 of a blues IV chord, say) are shown too.
export function chordOverScaleDots(tuning, scale, chord, { labels = 'degrees', to = 12 } = {}) {
  const lit = toneDots(tuning, chord.tones, { to, labels });
  const taken = new Set(lit.map((d) => `${d.string}:${d.fret}`));
  const faint = toneDots(tuning, scale, { to, labels: 'notes', role: 'ghost', blank: labels !== 'notes' });
  return [...faint.filter((d) => !taken.has(`${d.string}:${d.fret}`)), ...lit];
}

export const midisOf = (tuning, frets) => frets.flatMap((f, s) => (f < 0 ? [] : [tuning[s] + f]));

export const spelled = (tones) => tones.map((t) => noteName(t.note)).join(' ');

// Ascending MIDI notes for a set of tones, starting near the bottom of the guitar's range.
export const pitchesOf = (tones) => tones.map((t) => 45 + ((pc(tones[0].note) + 3) % 12) + t.interval.semitones);

// The formula as a row of tappable chips: note name over its degree.
export function ToneRow(tones) {
  const pitches = pitchesOf(tones);
  return h(
    'div',
    { class: 'tones' },
    tones.map((t, i) =>
      h('button', { type: 'button', class: `tone role-${t.interval.role}`, onclick: () => pluck(pitches[i]) }, h('b', {}, noteName(t.note)), h('small', {}, t.interval.label)),
    ),
  );
}

// "x32010", or "x-10-12-12-12-10" once a fret needs two digits.
export function fretString(frets) {
  const parts = frets.map((f) => (f < 0 ? 'x' : String(f)));
  return parts.join(frets.some((f) => f > 9) ? '-' : '');
}
