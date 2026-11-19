import { TONICS, PROGRESSIONS, makeKey, resolveStep } from '../theory/index.js';
import { load } from '../state/store.js';
import { chordStep, SHOW, POSITION, BACKING } from './chord-step.js';

export default {
  id: 'play-changes',
  listens: true,
  title: 'Changes',
  blurb: 'Loop a short progression in time. The key moves on every pass.',
  tip: 'Change on the click even if the chord is not clean yet: keeping time matters more. Work up the ladder: roots, chord shapes, triads, then 3rds and 7ths, then every chord tone. With the mic on, the single-note steps count how often you land on a wanted note as the chord arrives.',
  options: [
    {
      id: 'prog',
      label: 'Progression',
      default: 'major:1',
      choices: ['major', 'minor'].flatMap((mode) => PROGRESSIONS[mode].map((p, i) => ({ value: `${mode}:${i}`, label: p.title }))),
    },
    {
      id: 'keys',
      label: 'Each time round',
      default: 'fourths',
      choices: [
        { value: 'fourths', label: 'Up a 4th' },
        { value: 'random', label: 'Random key' },
        { value: 'stay', label: 'Same key' },
      ],
    },
    SHOW,
    POSITION,
    {
      id: 'bars',
      label: 'Bars per chord',
      default: '2',
      choices: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '4', label: '4' },
      ],
    },
    BACKING,
  ],

  next(opts, e, memo) {
    const [mode, index] = opts.prog.split(':');
    const prog = PROGRESSIONS[mode][Number(index)];
    const order = prog.form ?? prog.steps.map((_, i) => i);

    // Start in the key showing on the Keys tab, then move on after each pass.
    memo.tonic ??= load('view:keys', {}).tonic ?? 0;
    memo.at ??= 0;
    memo.pass ??= 0;
    if (memo.at >= order.length) {
      memo.at = 0;
      memo.pass++;
      if (opts.keys === 'fourths') memo.tonic = (memo.tonic + 11) % 12;
      if (opts.keys === 'random') memo.tonic = (memo.tonic + 1 + Math.floor(Math.random() * 11)) % 12;
    }
    const first = memo.at === 0;
    const key = makeKey(TONICS[mode][memo.tonic], mode);
    const chord = resolveStep(key, prog.steps[order[memo.at++]]);
    return chordStep({
      chord,
      key,
      beats: Number(opts.bars) * 4,
      title: chord.name,
      detail: `${chord.roman} in ${key.name}`,
      peek: first ? `${chord.name} in ${key.name}` : chord.name,
      opts,
      e,
      memo,
    });
  },
};
