import { h } from '../ui/dom.js';
import { Choices } from '../ui/controls.js';
import { TONICS, makeKey, diatonic, chordById, pc } from '../theory/index.js';
import { ChordAnswer } from './common.js';

const COMMON = [0, 1, 2, 3, 4, 11, 10, 9]; // up to four sharps or three flats
const TRIADS = ['maj', 'min', 'dim'].map(chordById);

export default {
  id: 'key-chords',
  group: 'Keys',
  title: 'Chords by number',
  blurb: 'Know the IV of A or the vi of E♭ on sight.',
  tip: 'The pattern never changes: I, IV and V are major, ii, iii and vi are minor, vii is diminished. Learn a progression as numbers and you can play it in every key. Start round the cycle of fourths, then go random.',
  options: [
    {
      id: 'keys',
      label: 'Keys',
      default: 'common',
      choices: [
        { value: 'common', label: 'Common keys' },
        { value: 'all', label: 'All twelve' },
      ],
    },
    {
      id: 'mode',
      label: 'Mode',
      default: 'major',
      choices: [
        { value: 'major', label: 'Major' },
        { value: 'minor', label: 'Minor' },
        { value: 'both', label: 'Both' },
      ],
    },
    {
      id: 'ask',
      label: 'Question',
      default: 'mixed',
      choices: [
        { value: 'mixed', label: 'Mixed' },
        { value: 'chord', label: 'Number → chord' },
        { value: 'numeral', label: 'Chord → number' },
      ],
    },
  ],

  pool(opts) {
    const modes = opts.mode === 'both' ? ['major', 'minor'] : [opts.mode];
    const tonics = opts.keys === 'common' ? COMMON : TONICS.major.map((_, i) => i);
    return modes.flatMap((mode) => tonics.flatMap((i) => [0, 1, 2, 3, 4, 5, 6].map((degree) => `${mode}:${i}:${degree}`)));
  },

  build(key, opts) {
    const [mode, i, degree] = key.split(':');
    const k = makeKey(TONICS[mode][Number(i)], mode);
    const chords = diatonic(k);
    const chord = chords[Number(degree)];
    const ask = opts.ask === 'mixed' ? (Math.random() < 0.5 ? 'chord' : 'numeral') : opts.ask;
    return { key, k, chords, chord, ask, label: `${chord.roman} in ${k.name} is ${chord.name}` };
  },

  render(q, ui) {
    const reveal = () =>
      ui.stage.replaceChildren(
        h(
          'div',
          { class: 'degrees' },
          q.chords.map((c) => h('span', { class: `degree${c === q.chord ? ' is-on' : ''}` }, h('small', {}, c.roman), h('b', {}, c.name))),
        ),
      );

    if (q.ask === 'chord') {
      ui.prompt(q.chord.roman, `in ${q.k.name}`);
      const answer = ChordAnswer({
        types: TRIADS,
        accidentals: ui.env.accidentals,
        onAnswer(rootPc, type) {
          if (ui.locked) return;
          const ok = rootPc === pc(q.chord.root) && type === q.chord.type;
          answer.classList.add(ok ? 'is-ok' : 'is-bad');
          if (!ok) answer.reveal(pc(q.chord.root));
          reveal();
          ui.done(ok, ok ? '' : `${q.label}.`);
        },
      });
      ui.answers.append(answer);
      return;
    }

    ui.prompt(q.chord.name, `in ${q.k.name} is which number?`);
    const choices = Choices({
      choices: q.chords.map((c) => ({ value: c.degree, label: c.roman })),
      columns: 4,
      onPick(degree, button) {
        if (ui.locked) return;
        const ok = degree === q.chord.degree;
        button.classList.add(ok ? 'is-ok' : 'is-bad');
        if (!ok) choices.button(q.chord.degree).classList.add('is-reveal');
        reveal();
        ui.done(ok, ok ? '' : `${q.label}.`);
      },
    });
    ui.answers.append(choices);
  },
};
