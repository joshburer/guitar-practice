import { Fretboard } from '../ui/fretboard.js';
import { ROOT_LABELS } from '../ui/tones.js';
import { scaleById, spellScale, pc, mod, noteName } from '../theory/index.js';
import { pluck } from '../audio/synth.js';
import { sample } from '../util.js';

const SCALE_IDS = ['minor-pentatonic', 'major-pentatonic', 'blues', 'major', 'minor'];
const PHASES = [
  ['Listen', 'the phrase starts on the root'],
  ['Your turn', 'play it back'],
  ['Check', 'play along with the answer'],
];

// Every scale note inside one hand position, low to high.
function position(tuning, scale) {
  const tones = new Map(scale.tones.map((t) => [pc(t.note), t]));
  const start = mod(pc(scale.root) - tuning[0], 12) || 12; // the root on the lowest string
  const lo = scale.tones.length > 6 ? start - 1 : start;
  const seen = new Set();
  const notes = [];
  tuning.forEach((open, string) => {
    for (let fret = lo; fret <= start + 3; fret++) {
      const tone = tones.get(mod(open + fret, 12));
      if (!tone || seen.has(open + fret)) continue;
      seen.add(open + fret);
      notes.push({ string, fret, midi: open + fret, tone });
    }
  });
  return { notes: notes.sort((a, b) => a.midi - b.midi), from: Math.max(lo - 1, lo === 0 ? 0 : 1) };
}

export default {
  id: 'play-echo',
  listens: true,
  title: 'Echo',
  blurb: 'Hear a short phrase, play it back, then check it.',
  tip: 'Sing the phrase before you reach for it. Every phrase starts on the root and stays inside one position, so the question is only which way it moved and how far. This is the bridge between your ear and your hands.',
  options: [
    {
      id: 'scale',
      label: 'Scale',
      default: 'minor-pentatonic',
      choices: SCALE_IDS.map((id) => ({ value: id, label: scaleById(id).name })),
    },
    {
      id: 'root',
      label: 'Key',
      default: '9',
      choices: ROOT_LABELS.map((label, p) => ({ value: String(p), label })),
    },
    {
      id: 'length',
      label: 'Phrase length',
      default: '3',
      choices: [
        { value: '2', label: '2 notes' },
        { value: '3', label: '3 notes' },
        { value: '4', label: '4 notes' },
      ],
    },
  ],

  next(opts, e, memo) {
    const tuning = e.tuning.midi;
    const scale = spellScale(Number(opts.root), scaleById(opts.scale));
    const { notes, from } = position(tuning, scale);

    // Start on a root, then wander by step or skip.
    let at = sample(notes.map((n, i) => (n.tone.interval.id === '1' ? i : -1)).filter((i) => i >= 0));
    const phrase = [notes[at]];
    while (phrase.length < Number(opts.length)) {
      const to = at + sample([-2, -1, 1, 2]);
      if (to < 0 || to >= notes.length) continue;
      phrase.push(notes[(at = to)]);
    }

    const dot = (n, i) => ({ string: n.string, fret: n.fret, label: e.labels === 'notes' ? noteName(n.tone.note) : n.tone.interval.label, role: i === 0 ? 'root' : 'ok' });
    // With the microphone on, what you play in your bar is compared with the phrase.
    const played = [];
    const matched = () => {
      let i = 0;
      for (const midi of played) if (midi === phrase[i]?.midi) i++;
      return i === phrase.length;
    };
    return {
      beats: 12,
      title: (b) => (b >= 8 && memo.listening ? (matched() ? 'You had it' : 'Not quite') : PHASES[Math.floor(b / 4)][0]),
      detail: (b) => PHASES[Math.floor(b / 4)][1],
      hear(midi, b) {
        if (b >= 4 && b < 8 && played[played.length - 1] !== midi) played.push(midi);
      },
      peek: `a ${phrase.length}-note phrase in ${scale.name}`,
      draw(el, b) {
        // Only the starting note until the check, then the phrase appears note by note.
        const shown = b < 8 ? 1 : Math.min(phrase.length, b - 7);
        el.replaceChildren(Fretboard({ tuning, from, to: from + 6, lefty: e.lefty, dots: phrase.slice(0, shown).map(dot) }));
      },
      sound(b, at_) {
        const i = b < 4 ? b : b - 8;
        if (i >= 0 && i < phrase.length) pluck(phrase[i].midi, 0, { at: at_ });
      },
    };
  },
};
