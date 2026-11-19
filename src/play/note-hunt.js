import { h } from '../ui/dom.js';
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
  blurb: 'Find the called note before the answer sounds.',
  tip: 'Say the note name out loud as you play it.',
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
      id: 'find',
      label: 'Time to find it',
      default: '4',
      choices: [
        { value: '2', label: '2 beats' },
        { value: '4', label: '4 beats' },
        { value: '8', label: '8 beats' },
      ],
    },
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
    const find = Number(opts.find ?? 4); // beats to find the note before the answer sounds
    // The string to play on, in big type above the neck: it is half the question.
    const neck = (el, config, where) => {
      const sig = JSON.stringify([config, where]);
      if (el.dataset.sig === sig) return; // nothing new this beat
      el.dataset.sig = sig;
      el.replaceChildren(...[where && h('p', { class: 'hunt-string' }, where), Fretboard({ tuning, from: 0, to: 12, lefty: e.lefty, ...config })].filter(Boolean));
    };

    if (opts.task === 'all') {
      const pcs = range(0, 11).filter((p) => p !== memo.last && (opts.notes === 'all' || isNatural(p)));
      const p = (memo.last = sample(pcs));
      const name = spellPc(p, e);
      const frets = tuning.map((open) => mod(p - open, 12));
      const got = new Set(); // strings the microphone has heard played right
      return {
        beats: find + 6,
        lead: 2,
        title: name,
        detail: (b) => (b < find ? 'every string, low to high' : `now the ${stringLabel(e, b - find)}`),
        peek: `${name} on every string`,
        draw(el, b) {
          const now = b - find;
          const dots = frets.flatMap((fret, string) => {
            if (got.has(string)) return [{ string, fret, label: name, role: 'ok' }];
            return reveal && string <= now ? [{ string, fret, label: name, role: 'reveal' }] : [];
          });
          neck(el, { dots, strings: now >= 0 ? [now] : undefined }, now >= 0 ? stringLabel(e, now) : 'Every string, low to high');
        },
        sound(b, at) {
          if (reveal && b >= find && !got.has(b - find)) pluck(tuning[b - find] + frets[b - find], 0, { at });
        },
        hear(midi) {
          frets.forEach((fret, string) => tuning[string] + fret === midi && got.add(string));
        },
      };
    }

    // Lean on what the Find the note drill has learned about your weak spots.
    const deck = `find-note@${e.tuning.id}`;
    // Never the same note on the same string twice running (fret 0 and fret 12 are the same question).
    const same = (k) => {
      if (!memo.last) return false;
      const [s1, f1] = memo.last.split(':').map(Number);
      const [s2, f2] = k.split(':').map(Number);
      return s1 === s2 && pcAt(tuning, s1, f1) === pcAt(tuning, s2, f2);
    };
    const pool = neckPool({ ...opts, frets: '0-12' }, e);
    const fresh = pool.filter((k) => !same(k));
    const key = (memo.last = pick(deck, fresh.length ? fresh : pool, memo.last));
    const [string, fret] = key.split(':').map(Number);
    const p = pcAt(tuning, string, fret);
    const name = spellPc(p, e);
    const spots = range(0, 12).filter((f) => pcAt(tuning, string, f) === p);
    let started = 0;
    let found = null; // seconds it took, once the microphone hears the right pitch
    let scored = false;
    return {
      beats: find + 2,
      lead: 2, // the next note is announced once this one's answer is out
      title: name,
      detail: () => (found == null ? '' : `Found in ${found.toFixed(1)}s`), // the string is shown big above the neck
      peek: `${name}, ${stringLabel(e, string)}`,
      draw(el, b) {
        started ||= performance.now();
        if (b >= find && !scored && memo.listening) {
          scored = true;
          record(deck, key, false); // the answer is out: too late to count
        }
        const role = found == null ? 'reveal' : 'ok';
        const dots = found != null || (reveal && b >= find) ? spots.map((f) => ({ string, fret: f, label: name, role })) : [];
        neck(el, { dots, strings: [string] }, stringLabel(e, string));
      },
      sound(b, at) {
        if (reveal && b === find && found == null) pluck(tuning[string] + spots[0], 0, { at });
      },
      reset() {
        started = 0;
        if (found == null) scored = false;
      },
      hear(midi, b) {
        if (scored || b >= find || !spots.some((f) => tuning[string] + f === midi)) return;
        started ||= performance.now();
        found = (performance.now() - started) / 1000;
        scored = true;
        record(deck, key, true);
      },
    };
  },
};
