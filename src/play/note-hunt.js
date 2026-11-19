import { Fretboard } from '../ui/fretboard.js';
import { pcAt, isNatural, mod } from '../theory/index.js';
import { pluck } from '../audio/synth.js';
import { pick, record } from '../state/progress.js';
import { sample, range } from '../util.js';
import { NECK_OPTIONS, neckPool, stringLabel, spellPc } from '../drills/common.js';

const [STRINGS, , NOTES] = NECK_OPTIONS;

export default {
  id: 'play-note-hunt',
  listens: true,
  title: 'Note hunt',
  blurb: 'A note is called. Find it and play it before the answer sounds.',
  tip: 'Say the note name as you play it. You get two clicks to find it, then the answer sounds: if what you played matches, you had it. Too easy? Raise the tempo or hide the answer. With the mic on, your notes are checked and scored for you, and misses feed the heat map on the Train tab.',
  options: [
    {
      id: 'task',
      label: 'Play the note',
      default: 'one',
      choices: [
        { value: 'one', label: 'On one string' },
        { value: 'all', label: 'On all six, low to high' },
      ],
    },
    { ...STRINGS, label: 'String (one-string hunts)' },
    NOTES,
    {
      id: 'answer',
      label: 'Answer',
      default: 'on',
      choices: [
        { value: 'on', label: 'Show and sound it' },
        { value: 'off', label: 'Keep it hidden' },
      ],
    },
  ],

  next(opts, e, memo) {
    const tuning = e.tuning.midi;
    const reveal = opts.answer === 'on';
    const neck = (el, config) => el.replaceChildren(Fretboard({ tuning, from: 0, to: 12, lefty: e.lefty, ...config }));

    if (opts.task === 'all') {
      const pcs = range(0, 11).filter((p) => p !== memo.last && (opts.notes === 'all' || isNatural(p)));
      const p = (memo.last = sample(pcs));
      const name = spellPc(p, e);
      const frets = tuning.map((open) => mod(p - open, 12));
      const got = new Set(); // strings the microphone has heard played right
      return {
        beats: 8,
        title: name,
        detail: (b) => (b < 2 ? 'every string, low to high' : `now the ${stringLabel(e, b - 2)}`),
        peek: `${name} on every string`,
        draw(el, b) {
          const now = b - 2;
          const dots = frets.flatMap((fret, string) => {
            if (got.has(string)) return [{ string, fret, label: name, role: 'ok' }];
            return reveal && string <= now ? [{ string, fret, label: name, role: 'reveal' }] : [];
          });
          neck(el, { dots, strings: now >= 0 ? [now] : undefined });
        },
        sound(b, at) {
          if (reveal && b >= 2 && !got.has(b - 2)) pluck(tuning[b - 2] + frets[b - 2], 0, { at });
        },
        hear(midi) {
          frets.forEach((fret, string) => tuning[string] + fret === midi && got.add(string));
        },
      };
    }

    // Lean on what the Find the note drill has learned about your weak spots.
    const deck = `find-note@${e.tuning.id}`;
    const key = (memo.last = pick(deck, neckPool({ ...opts, frets: '0-12' }, e), memo.last));
    const [string, fret] = key.split(':').map(Number);
    const p = pcAt(tuning, string, fret);
    const name = spellPc(p, e);
    const spots = range(0, 12).filter((f) => pcAt(tuning, string, f) === p);
    let started = 0;
    let found = null; // seconds it took, once the microphone hears the right pitch
    let scored = false;
    return {
      beats: 4,
      title: name,
      detail: () => (found == null ? `on the ${stringLabel(e, string)}` : `Found in ${found.toFixed(1)}s`),
      peek: `${name}, ${stringLabel(e, string)}`,
      draw(el, b) {
        started ||= performance.now();
        if (b >= 2 && !scored && memo.listening) {
          scored = true;
          record(deck, key, false); // the answer is out: too late to count
        }
        const role = found == null ? 'reveal' : 'ok';
        const dots = found != null || (reveal && b >= 2) ? spots.map((f) => ({ string, fret: f, label: name, role })) : [];
        neck(el, { dots, strings: [string] });
      },
      sound(b, at) {
        if (reveal && b === 2 && found == null) pluck(tuning[string] + spots[0], 0, { at });
      },
      hear(midi, b) {
        if (scored || b >= 2 || !spots.some((f) => tuning[string] + f === midi)) return;
        started ||= performance.now();
        found = (performance.now() - started) / 1000;
        scored = true;
        record(deck, key, true);
      },
    };
  },
};
