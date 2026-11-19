import { h } from '../ui/dom.js';
import { ChordDiagram } from '../ui/chord-diagram.js';
import { chordById, spellChord, sameSet, voicings, noteName, pc } from '../theory/index.js';
import { strum } from '../audio/synth.js';
import { sample, shuffle, range } from '../util.js';
import { ChordAnswer, toneInfo, midisOf, spelled } from './common.js';

export const CHORD_SETS = {
  triads: ['maj', 'min', 'dim', 'aug', 'sus2', 'sus4'],
  sevenths: ['maj7', '7', 'm7', 'm7b5', 'dim7'],
};
CHORD_SETS.both = [...CHORD_SETS.triads, ...CHORD_SETS.sevenths];

export const CHORD_SET_OPTION = {
  id: 'set',
  label: 'Chord types',
  default: 'triads',
  choices: [
    { value: 'triads', label: 'Triads' },
    { value: 'sevenths', label: '7ths' },
    { value: 'both', label: 'Both' },
  ],
};

export const chordPool = (opts) => CHORD_SETS[opts.set].flatMap((id) => range(0, 11).map((p) => `${p}:${id}`));

export default {
  id: 'name-chord',
  group: 'Chords',
  title: 'Name the chord',
  blurb: 'Work out a chord from its notes.',
  tip: 'Find the root first, then read the 3rd: major or minor decides most of it. From there the 5th and 7th are small adjustments. With a guitar in hand, play the shape and say each chord tone.',
  options: [
    CHORD_SET_OPTION,
    {
      id: 'view',
      label: 'Show as',
      default: 'shape',
      choices: [
        { value: 'shape', label: 'Shape on the neck' },
        { value: 'names', label: 'Note names' },
      ],
    },
  ],
  pool: chordPool,

  build(key, opts, e) {
    const [p, id] = key.split(':');
    const chord = spellChord(Number(p), chordById(id));
    const shapes = opts.view === 'shape' ? voicings(e.tuning.midi, Number(p), chord.type).filter((v) => v.complete) : [];
    return { key, chord, shape: shapes.length ? sample(shapes) : null, order: shuffle(chord.tones), label: `${chord.name} = ${spelled(chord.tones)}` };
  },

  render(q, ui) {
    const { tuning, lefty, accidentals } = ui.env;
    const types = CHORD_SETS[ui.opts.set].map(chordById);
    ui.prompt('Name the chord', q.shape ? 'Read the notes off the shape. Tap it to hear it.' : 'These notes, in any order');

    const draw = (revealed) => {
      if (q.shape) {
        const info = revealed ? toneInfo(tuning.midi, q.chord.tones) : () => ({ role: 'q' });
        const play = () => strum(midisOf(tuning.midi, q.shape.frets));
        ui.stage.replaceChildren(h('div', { class: 'center' }, ChordDiagram({ frets: q.shape.frets, info, lefty, scale: 1.6, onClick: play })));
      } else {
        const tones = revealed ? q.chord.tones : q.order;
        ui.stage.replaceChildren(
          h('div', { class: 'tones tones-big' }, tones.map((t) => h('span', { class: `tone ${revealed ? `role-${t.interval.role}` : ''}` }, h('b', {}, noteName(t.note)), revealed && h('small', {}, t.interval.label)))),
        );
      }
    };

    const answer = ChordAnswer({
      types,
      accidentals,
      onAnswer(rootPc, type) {
        if (ui.locked) return;
        const guess = spellChord(rootPc, type);
        const ok = sameSet(guess.pcs, q.chord.pcs); // C6 and Am7 share notes: either name is right
        answer.classList.add(ok ? 'is-ok' : 'is-bad');
        if (!ok) answer.reveal(pc(q.chord.root));
        draw(true);
        if (q.shape) strum(midisOf(tuning.midi, q.shape.frets));
        ui.done(ok, ok && guess.name === q.chord.name ? '' : q.label);
      },
    });
    ui.answers.append(answer);
    draw(false);
  },
};
