import { h } from '../ui/dom.js';
import { Fretboard } from '../ui/fretboard.js';
import { RootPicker, Select } from '../ui/controls.js';
import { ROOT_LABELS, toneDots, ToneRow, pitchesOf } from '../ui/tones.js';
import { SCALES, scaleById, spellScale, CHORDS, chordById, spellChord } from '../theory/index.js';
import { run } from '../audio/synth.js';
import { env } from '../state/settings.js';
import { header, LabelToggle, viewState, playButton } from './common.js';

const groupsOf = (items, prefix) =>
  [...new Set(items.map((i) => i.group))].map((label) => ({
    label,
    options: items.filter((i) => i.group === label).map((i) => ({ value: `${prefix}:${i.id}`, label: i.name })),
  }));

// Any scale or arpeggio, from any root, across the whole neck.
export function NeckView(root, app) {
  const e = env();
  const [state, set] = viewState('neck', { root: 9, show: 'scale:minor-pentatonic' }, app);
  const [kind, id] = state.show.split(':');
  const shown = kind === 'scale' ? spellScale(state.root, scaleById(id) ?? SCALES[0]) : spellChord(state.root, chordById(id) ?? CHORDS[0]);
  const title = kind === 'scale' ? shown.name : `${shown.name} arpeggio`;

  root.append(
    header('Neck', app),
    RootPicker({ value: state.root, names: ROOT_LABELS, onChange: (p) => set({ root: p }) }),
    Select({
      id: 'neck-show',
      label: 'Show',
      value: state.show,
      onChange: (show) => set({ show }),
      groups: [...groupsOf(SCALES, 'scale'), ...groupsOf(CHORDS, 'chord').map((g) => ({ ...g, label: `Arpeggios: ${g.label.toLowerCase()}` }))],
    }),
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'title-row' }, h('h2', { class: 'title' }, title), LabelToggle()),
      Fretboard({ tuning: e.tuning.midi, from: 0, to: 15, lefty: e.lefty, label: title, dots: toneDots(e.tuning.midi, shown.tones, { to: 15, labels: e.labels }) }),
      h('div', { class: 'title-row' }, ToneRow(shown.tones), playButton('Play', () => run([...pitchesOf(shown.tones), pitchesOf(shown.tones)[0] + 12]))),
    ),
  );
}
