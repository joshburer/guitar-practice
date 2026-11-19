import { Fretboard } from '../ui/fretboard.js';
import { Choices } from '../ui/controls.js';
import { INTERVALS, SIMPLE_INTERVALS, mod } from '../theory/index.js';
import { pluck } from '../audio/synth.js';
import { sample, range } from '../util.js';

const SETS = { tones: ['b3', '3', '5', 'b7', '7'], all: SIMPLE_INTERVALS };

// How many frets the target sits from the root when it is `across` strings higher.
const offset = (tuning, string, across, semitones) => semitones - (tuning[string + across] - tuning[string]);
const reachable = (off, across) => off >= -4 && off <= 5 && !(across === 0 && off === 0);

function rootStrings(tuning, id, across) {
  return range(0, tuning.length - 1 - across).filter((s) => reachable(offset(tuning, s, across, INTERVALS[id].semitones), across));
}

export default {
  id: 'neck-intervals',
  group: 'Fretboard',
  neck: true,
  title: 'Interval shapes',
  blurb: 'See the 3rd, 5th and 7th around any root.',
  tip: 'Learn where the 3rd and 7th sit around a root: every chord is those few shapes.',
  options: [
    {
      id: 'mode',
      label: 'Question',
      default: 'name',
      choices: [
        { value: 'name', label: 'Name the interval' },
        { value: 'find', label: 'Find it on the neck' },
      ],
    },
    {
      id: 'set',
      label: 'Intervals',
      default: 'tones',
      choices: [
        { value: 'tones', label: 'Chord tones' },
        { value: 'all', label: 'All twelve' },
      ],
    },
  ],

  pool(opts, e) {
    return SETS[opts.set].flatMap((id) => [0, 1, 2].filter((across) => rootStrings(e.tuning.midi, id, across).length).map((across) => `${id}:${across}`));
  },

  build(key, opts, e) {
    const [id, acrossText] = key.split(':');
    const across = Number(acrossText);
    const tuning = e.tuning.midi;
    const interval = INTERVALS[id];
    const string = sample(rootStrings(tuning, id, across));
    const off = offset(tuning, string, across, interval.semitones);
    const fret = sample(range(Math.max(1, 1 - off), Math.min(12, 12 - off)));
    const target = { string: string + across, fret: fret + off };
    const from = Math.max(1, Math.min(fret, target.fret) - 2);
    return {
      key,
      interval,
      root: { string, fret },
      target,
      from,
      to: Math.max(from + 7, Math.max(fret, target.fret) + 2),
      label: `${interval.name} (${interval.label}), ${across === 0 ? 'same string' : across === 1 ? 'next string up' : 'two strings up'}`,
    };
  },

  render(q, ui) {
    const { tuning, lefty } = ui.env;
    const midi = (pos) => tuning.midi[pos.string] + pos.fret;
    const rootDot = { ...q.root, label: 'R', role: 'root' };
    const play = () => {
      pluck(midi(q.root));
      pluck(midi(q.target), 0.3);
    };
    const draw = (dots, onTap) => ui.stage.replaceChildren(Fretboard({ tuning: tuning.midi, from: q.from, to: q.to, lefty, dots: [rootDot, ...dots], onTap }));

    if (ui.opts.mode === 'find') {
      ui.prompt(`Find the ${q.interval.label}`, `${q.interval.name}, above the root`);
      const tap = (pos) => {
        if (ui.locked) return;
        const ok = midi(pos) === midi(q.target);
        const tapped = INTERVALS[SIMPLE_INTERVALS.find((id) => INTERVALS[id].semitones % 12 === mod(midi(pos) - midi(q.root), 12))];
        const dots = [{ ...(ok ? pos : q.target), label: q.interval.label, role: 'ok' }];
        if (!ok) dots.push({ ...pos, label: midi(pos) === midi(q.root) ? '' : (tapped?.label ?? 'R'), role: 'bad' });
        draw(dots);
        play();
        ui.done(ok, ok ? '' : `The ${q.interval.label} is the green dot.`);
      };
      draw([], tap);
      return;
    }

    ui.prompt('Which interval?', 'From R up to ?');
    const choices = Choices({
      choices: SETS[ui.opts.set].map((id) => ({ value: id, label: INTERVALS[id].label, hint: INTERVALS[id].name })),
      columns: ui.opts.set === 'tones' ? 3 : 4,
      onPick(id, button) {
        if (ui.locked) return;
        const ok = id === q.interval.id;
        button.classList.add(ok ? 'is-ok' : 'is-bad');
        if (!ok) choices.button(q.interval.id).classList.add('is-reveal');
        draw([{ ...q.target, label: q.interval.label, role: ok ? 'ok' : 'reveal' }]);
        play();
        ui.done(ok, ok ? '' : `That is a ${q.interval.name.toLowerCase()}.`);
      },
    });
    ui.answers.append(choices);
    draw([{ ...q.target, label: '?', role: 'q' }]);
  },
};
