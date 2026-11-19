import { h } from '../ui/dom.js';
import { Fretboard } from '../ui/fretboard.js';
import { ChordDiagram } from '../ui/chord-diagram.js';
import { RootPicker, Select, Segmented } from '../ui/controls.js';
import { ROOT_LABELS, toneInfo, ToneRow, midisOf, fretString } from '../ui/tones.js';
import { CHORDS, chordById, spellChord, voicings, triadShapes, identify, intervalBetween, pcAt, pcName, stringName } from '../theory/index.js';
import { strum, pluck } from '../audio/synth.js';
import { env } from '../state/settings.js';
import { header, LabelToggle, viewState, playButton } from './common.js';

const TABS = [
  { value: 'voicings', label: 'Voicings' },
  { value: 'triads', label: 'Triads' },
  { value: 'identify', label: 'Identify' },
];

export function ChordsView(root, app) {
  const [state, set] = viewState('chords', { tab: 'voicings', root: 0, type: 'maj', triad: 'maj', set: 3, frets: [-1, 3, 2, 0, 1, 0] }, app);
  root.append(header('Chords', app), Segmented({ label: 'Chord tools', options: TABS, value: state.tab, onChange: (tab) => set({ tab }) }));
  ({ voicings: Voicings, triads: Triads, identify: Identify })[state.tab](root, state, set, env());
}

const card = (e, chord, frets, caption) =>
  h(
    'button',
    { type: 'button', class: 'shape', onclick: () => strum(midisOf(e.tuning.midi, frets)) },
    ChordDiagram({ frets, lefty: e.lefty, scale: 1.15, info: toneInfo(e.tuning.midi, chord.tones, e.labels), label: `${chord.name}, ${caption}` }),
    h('b', {}, caption),
    h('small', {}, fretString(frets)),
  );

// Every playable grip for a chord, low on the neck to high.
function Voicings(root, state, set, e) {
  const chord = spellChord(state.root, chordById(state.type) ?? CHORDS[0]);
  const shapes = voicings(e.tuning.midi, state.root, chord.type);
  const groups = [...new Set(CHORDS.map((c) => c.group))].map((label) => ({
    label,
    options: CHORDS.filter((c) => c.group === label).map((c) => ({ value: c.id, label: c.name })),
  }));
  root.append(
    RootPicker({ value: state.root, names: ROOT_LABELS, onChange: (p) => set({ root: p }) }),
    Select({ id: 'chord-type', label: 'Chord', groups, value: chord.type.id, onChange: (type) => set({ type }) }),
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'title-row' }, h('h2', { class: 'title' }, chord.name, h('span', {}, chord.type.name)), LabelToggle()),
      ToneRow(chord.tones),
      shapes.length
        ? h('div', { class: 'shapes' }, shapes.map((v) => card(e, chord, v.frets, v.frets.includes(0) ? 'Open' : `Fret ${v.baseFret}`)))
        : h('p', { class: 'muted' }, 'No comfortable grip for this chord in this tuning.'),
      h('p', { class: 'muted small' }, 'Tap a shape to hear it. Shapes run from the nut up the neck: the same chord in every position.'),
    ),
  );
}

// Three-string triads: the small shapes that connect the whole neck.
function Triads(root, state, set, e) {
  const tuning = e.tuning.midi;
  const chord = spellChord(state.root, chordById(state.triad));
  const lo = Math.min(state.set, tuning.length - 3);
  const shapes = triadShapes(tuning, state.root, chord.type, lo);
  const info = toneInfo(tuning, chord.tones, e.labels);
  const dots = shapes.flatMap((sh) => sh.frets.flatMap((fret, string) => (fret < 0 ? [] : [{ string, fret, ...info(string, fret) }])));
  const sets = [3, 2, 1, 0].map((s) => ({ value: s, label: [s, s + 1, s + 2].map((i) => stringName(tuning, i)).join(' ') }));
  const names = ['Root position', '1st inversion', '2nd inversion'];
  root.append(
    RootPicker({ value: state.root, names: ROOT_LABELS, onChange: (p) => set({ root: p }) }),
    Segmented({
      label: 'Triad quality',
      value: state.triad,
      onChange: (triad) => set({ triad }),
      options: ['maj', 'min', 'dim', 'aug'].map((id) => ({ value: id, label: chordById(id).name })),
    }),
    h('div', { class: 'field' }, h('p', { class: 'field-label' }, 'String set'), Segmented({ label: 'String set', options: sets, value: lo, onChange: (s) => set({ set: s }) })),
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'title-row' }, h('h2', { class: 'title' }, chord.name, h('span', {}, 'triad inversions')), LabelToggle()),
      Fretboard({ tuning, from: 0, to: 15, lefty: e.lefty, dots, label: `${chord.name} triads` }),
      h(
        'div',
        { class: 'shapes shapes-3' },
        [...shapes].sort((a, b) => Math.min(...a.frets.filter((f) => f >= 0)) - Math.min(...b.frets.filter((f) => f >= 0))).map((sh) => card(e, chord, sh.frets, names[sh.inversion])),
      ),
      h('p', { class: 'muted small' }, 'Each shape holds the same three notes with a different one on the bottom. Move between neighbours and notice which note stays put.'),
    ),
  );
}

// Put fingers on the neck, get the chord name back.
function Identify(root, state, set, e) {
  const tuning = e.tuning.midi;
  const frets = tuning.map((_, s) => state.frets[s] ?? -1);
  const pcs = frets.flatMap((f, s) => (f < 0 ? [] : [pcAt(tuning, s, f)]));
  const distinct = [...new Set(pcs)];
  const found = identify(pcs, pcs[0]);
  const best = found[0];
  const info = best ? toneInfo(tuning, best.tones, e.labels) : (s, f) => ({ label: pcName(pcAt(tuning, s, f), 'sharp'), role: 'reveal' });
  const dots = frets.flatMap((fret, string) => (fret < 0 ? [] : [{ string, fret, ...info(string, fret) }]));

  let name = 'Tap the neck';
  let detail = 'One note per string. Tap a note again to remove it.';
  if (best) {
    name = best.name;
    detail = [best.type.name + (best.noFifth ? ', no 5th' : ''), found.length > 1 && `also ${found.slice(1, 4).map((c) => c.name).join(', ')}`].filter(Boolean).join(' · ');
  } else if (distinct.length === 2) {
    const interval = intervalBetween(pcs[0], pcs.find((p) => p !== pcs[0]));
    name = interval.semitones === 7 ? `${pcName(pcs[0], 'flat')}5` : interval.name;
    detail = `${distinct.map((p) => pcName(p)).join(' and ')}: add a third note to make a chord`;
  } else if (distinct.length === 1) {
    name = pcName(distinct[0]);
    detail = 'Add two more notes to make a chord.';
  } else if (distinct.length) {
    name = 'No common name';
    detail = `${distinct.map((p) => pcName(p, 'sharp')).join(' ')}: try moving one note.`;
  }

  const tap = ({ string, fret }) => {
    const next = [...frets];
    next[string] = next[string] === fret ? -1 : fret;
    if (next[string] >= 0) pluck(tuning[string] + fret);
    set({ frets: next });
  };

  root.append(
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'title-row' }, h('h2', { class: 'title title-big' }, name), LabelToggle()),
      h('p', { class: 'muted' }, detail),
      Fretboard({ tuning, from: 0, to: 12, lefty: e.lefty, dots, onTap: tap, label: 'Tap to place notes' }),
      best && ToneRow(best.tones),
      h(
        'div',
        { class: 'actions' },
        playButton('Strum', () => strum(midisOf(tuning, frets))),
        h('button', { type: 'button', class: 'btn', onclick: () => set({ frets: tuning.map(() => -1) }) }, 'Clear'),
      ),
    ),
  );
}
