import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { Fretboard } from '../ui/fretboard.js';
import { ChordDiagram } from '../ui/chord-diagram.js';
import { RootPicker, Segmented } from '../ui/controls.js';
import { chordOverScaleDots, toneInfo, ToneRow, midisOf, fretString } from '../ui/tones.js';
import { TONICS, makeKey, diatonic, signature, relative, PROGRESSIONS, resolveStep, voicings, bestVoicing, pc } from '../theory/index.js';
import { strum } from '../audio/synth.js';
import { env } from '../state/settings.js';
import { header, LabelToggle, viewState, section } from './common.js';

const firstShape = (e, chord) => bestVoicing(voicings(e.tuning.midi, pc(chord.root), chord.type));

function playChords(e, chords) {
  chords.forEach((chord, i) => {
    const shape = firstShape(e, chord);
    if (shape) strum(midisOf(e.tuning.midi, shape.frets), i * 0.85);
  });
}

// One key at a time: its chords by number, where they sit on the neck, and the progressions built from them.
export function KeysView(root, app) {
  const e = env();
  const tuning = e.tuning.midi;
  const [state, set] = viewState('keys', { tonic: 0, mode: 'major', sevenths: false, degree: 0 }, app);
  const key = makeKey(TONICS[state.mode][state.tonic], state.mode);
  const chords = diatonic(key, state.sevenths);
  const chord = chords[state.degree];
  const rel = relative(key);
  const shapes = voicings(tuning, pc(chord.root), chord.type).slice(0, 3);

  const chordInfo = toneInfo(tuning, chord.tones, e.labels);
  const dots = chordOverScaleDots(tuning, key.scale, chord, { labels: e.labels });

  root.append(
    header('Keys', app),
    Segmented({
      label: 'Mode',
      value: state.mode,
      onChange: (mode) => set({ mode, degree: 0 }),
      options: [
        { value: 'major', label: 'Major' },
        { value: 'minor', label: 'Minor' },
      ],
    }),
    RootPicker({ label: 'Key', value: state.tonic, names: TONICS[state.mode], onChange: (tonic) => set({ tonic, degree: 0 }) }),
    h(
      'div',
      { class: 'actions' },
      h('button', { type: 'button', class: 'btn', onclick: () => set({ tonic: (state.tonic + 11) % 12, degree: 0 }) }, 'Next key, up a 4th'),
      h('button', { type: 'button', class: 'btn', onclick: () => set({ tonic: (state.tonic + 1 + Math.floor(Math.random() * 11)) % 12, degree: 0 }) }, icon('shuffle', 16), 'Random key'),
    ),
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'title-row' }, h('h2', { class: 'title title-big' }, key.name), h('p', { class: 'muted small' }, `${signature(key) || 'No sharps or flats'} · relative ${rel.name}`)),
      ToneRow(key.scale),
    ),
    h(
      'section',
      { class: 'section' },
      h(
        'div',
        { class: 'title-row' },
        h('h2', { class: 'eyebrow' }, 'Chords in the key'),
        Segmented({
          label: 'Chord size',
          value: state.sevenths,
          onChange: (sevenths) => set({ sevenths }),
          options: [
            { value: false, label: 'Triads' },
            { value: true, label: '7ths' },
          ],
        }),
      ),
      h(
        'div',
        { class: 'degrees degrees-pick' },
        chords.map((c) =>
          h(
            'button',
            { type: 'button', class: `degree${c.degree === state.degree ? ' is-on' : ''}`, 'aria-pressed': String(c.degree === state.degree), onclick: () => set({ degree: c.degree }) },
            h('small', {}, c.roman),
            h('b', {}, c.name),
          ),
        ),
        h('button', { type: 'button', class: 'degree degree-play', 'aria-label': 'Play all seven chords', onclick: () => playChords(e, chords) }, icon('play', 18)),
      ),
    ),
    h(
      'section',
      { class: 'section' },
      h('div', { class: 'title-row' }, h('h2', { class: 'title' }, chord.name, h('span', {}, `${chord.roman} of ${key.name}`)), LabelToggle()),
      Fretboard({ tuning, from: 0, to: 12, lefty: e.lefty, dots, label: `${chord.name} inside ${key.name}` }),
      h(
        'div',
        { class: 'shapes shapes-3' },
        shapes.map((v) =>
          h(
            'button',
            { type: 'button', class: 'shape', onclick: () => strum(midisOf(tuning, v.frets)) },
            ChordDiagram({ frets: v.frets, lefty: e.lefty, scale: 1.15, info: chordInfo, label: chord.name }),
            h('b', {}, v.frets.includes(0) ? 'Open' : `Fret ${v.baseFret}`),
            h('small', {}, fretString(v.frets)),
          ),
        ),
      ),
      h('p', { class: 'muted small' }, 'The faint dots are the key’s scale. The bright ones are this chord’s tones: the notes to land on while it is sounding.'),
    ),
    section(
      'Progressions to play in this key',
      h(
        'div',
        { class: 'list' },
        PROGRESSIONS[state.mode].map((prog) => {
          const steps = prog.steps.map((s) => resolveStep(key, s));
          return h(
            'button',
            { type: 'button', class: 'row row-prog', 'aria-label': `Play ${prog.title}`, onclick: () => playChords(e, steps) },
            h('span', { class: 'row-text' }, h('b', {}, steps.map((c) => c.name).join('  ')), h('span', {}, `${steps.map((c) => c.roman).join(' – ')} · ${prog.title}`)),
            icon('play', 18),
          );
        }),
      ),
    ),
  );
}
