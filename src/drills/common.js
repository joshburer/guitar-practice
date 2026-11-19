import { h } from '../ui/dom.js';
import { NotePad, Segmented } from '../ui/controls.js';
import { pcAt, pcName, isNatural, stringName, stringOrdinal } from '../theory/index.js';
import { range } from '../util.js';

// Shared by the note drills: which part of the neck to ask about.
export const NECK_OPTIONS = [
  {
    id: 'strings',
    label: 'Strings',
    default: 'all',
    choices: (e) => [
      { value: 'all', label: 'All' },
      ...e.tuning.midi.map((_, s) => ({ value: String(s), label: `${e.tuning.midi.length - s} · ${stringName(e.tuning.midi, s)}` })),
    ],
  },
  {
    id: 'frets',
    label: 'Frets',
    default: '0-12',
    choices: [
      { value: '0-12', label: 'Whole neck' },
      { value: '0-5', label: '0–5' },
      { value: '5-9', label: '5–9' },
      { value: '7-12', label: '7–12' },
    ],
  },
  {
    id: 'notes',
    label: 'Notes',
    default: 'all',
    choices: [
      { value: 'all', label: 'All twelve' },
      { value: 'natural', label: 'Naturals only' },
    ],
  },
];

export const fretRange = (opts) => opts.frets.split('-').map(Number);

export function neckPool(opts, e) {
  const [from, to] = fretRange(opts);
  const strings = opts.strings === 'all' ? e.tuning.midi.map((_, s) => s) : [Number(opts.strings)];
  return strings.flatMap((s) =>
    range(from, to)
      .filter((f) => opts.notes === 'all' || isNatural(pcAt(e.tuning.midi, s, f)))
      .map((f) => `${s}:${f}`),
  );
}

export const stringLabel = (e, s) => `${stringOrdinal(e.tuning.midi, s)} string (${stringName(e.tuning.midi, s)})`;

// One spelling for a pitch class. With "both" in settings, alternate so you learn C♯ and D♭ alike.
export function spellPc(p, e) {
  const style = e.accidentals === 'both' ? (Math.random() < 0.5 ? 'sharp' : 'flat') : e.accidentals;
  return pcName(p, style);
}

// Root + quality answer used by the chord drills. Fires once both are chosen.
export function ChordAnswer({ types, accidentals, onAnswer }) {
  let root = null;
  let type = null;
  const check = () => root != null && type && onAnswer(root, type);
  const pad = NotePad({
    accidentals,
    onPick: (p, button) => {
      pad.querySelectorAll('.is-on').forEach((b) => b.classList.remove('is-on'));
      button.classList.add('is-on');
      root = p;
      check();
    },
  });
  const quality = h('div', { class: 'quality' });
  const draw = () =>
    quality.replaceChildren(
      Segmented({
        label: 'Chord quality',
        columns: types.length > 6 ? 4 : 3,
        options: types.map((t) => ({ value: t.id, label: t.short })),
        value: type?.id,
        onChange: (id) => {
          type = types.find((t) => t.id === id);
          draw();
          check();
        },
      }),
    );
  draw();
  const el = h('div', { class: 'chord-answer' }, pad, quality);
  // After a miss, outline the root that was wanted.
  el.reveal = (rootPc) => pad.button(rootPc).classList.add('is-reveal');
  return el;
}

export { toneInfo, midisOf, spelled } from '../ui/tones.js';
