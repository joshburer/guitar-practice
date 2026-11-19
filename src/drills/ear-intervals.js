import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { Choices } from '../ui/controls.js';
import { INTERVALS, SIMPLE_INTERVALS } from '../theory/index.js';
import { pluck } from '../audio/synth.js';
import { sample, range } from '../util.js';

const SETS = { basic: ['b3', '3', '4', '5', '8'], tones: ['b3', '3', '5', 'b7', '7'], all: SIMPLE_INTERVALS };

export default {
  id: 'ear-intervals',
  group: 'Ear',
  needsSound: true,
  title: 'Intervals by ear',
  blurb: 'Hear two notes, name the distance.',
  tip: 'Sing the two notes back before you answer. Tie each interval to a sound you know, then to its shape on the neck: the goal is to hear a 3rd and already know where your finger goes.',
  options: [
    {
      id: 'set',
      label: 'Intervals',
      default: 'basic',
      choices: [
        { value: 'basic', label: '3rds, 4th, 5th, octave' },
        { value: 'tones', label: 'Chord tones' },
        { value: 'all', label: 'All twelve' },
      ],
    },
    {
      id: 'play',
      label: 'Played',
      default: 'up',
      choices: [
        { value: 'up', label: 'Rising' },
        { value: 'down', label: 'Falling' },
        { value: 'together', label: 'Together' },
      ],
    },
  ],

  pool: (opts) => SETS[opts.set],

  build(key) {
    const interval = INTERVALS[key];
    return { key, interval, low: sample(range(45, 62)), label: `${interval.name} (${interval.label})` };
  },

  render(q, ui) {
    const high = q.low + q.interval.semitones;
    const [first, second] = ui.opts.play === 'down' ? [high, q.low] : [q.low, high];
    const play = () => {
      pluck(first, 0, { force: true });
      pluck(second, ui.opts.play === 'together' ? 0 : 0.55, { force: true });
    };
    ui.prompt('Which interval?', 'Tap the speaker to hear it again');
    ui.stage.append(h('div', { class: 'center' }, h('button', { type: 'button', class: 'listen', 'aria-label': 'Play the interval again', onclick: play }, icon('play', 40))));

    const choices = Choices({
      choices: SETS[ui.opts.set].map((id) => ({ value: id, label: INTERVALS[id].label, hint: INTERVALS[id].name })),
      columns: SETS[ui.opts.set].length > 6 ? 4 : 3,
      onPick(id, button) {
        if (ui.locked) return;
        const ok = id === q.key;
        button.classList.add(ok ? 'is-ok' : 'is-bad');
        if (!ok) choices.button(q.key).classList.add('is-reveal');
        ui.done(ok, ok ? '' : `That was a ${q.interval.name.toLowerCase()}.`);
      },
    });
    ui.answers.append(choices);
    play();
  },
};
