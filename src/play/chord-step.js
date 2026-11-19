import { h } from '../ui/dom.js';
import { Fretboard } from '../ui/fretboard.js';
import { ChordDiagram } from '../ui/chord-diagram.js';
import { toneInfo, toneDots, chordOverScaleDots, midisOf } from '../ui/tones.js';
import { voicings, bestVoicing, triadShapes, chordById, pc, pcName, noteName, spellChord } from '../theory/index.js';
import { blend, judgeChord } from '../audio/chroma.js';
import { strum } from '../audio/synth.js';

// One chord of a play-along, shared by Changes and Songs. The options are a ladder for learning any tune:
// roots, then full chords, then triads, then the 3rds and 7ths, then every chord tone, each in every position.

export const SHOW = {
  id: 'show',
  label: 'Play',
  default: 'shapes',
  choices: [
    { value: 'roots', label: 'Roots' },
    { value: 'shapes', label: 'Chord shapes' },
    { value: 'triads', label: 'Triads' },
    { value: 'guide', label: '3rds & 7ths' },
    { value: 'tones', label: 'Chord tones' },
  ],
};

export const POSITION = {
  id: 'position',
  label: 'Where on the neck',
  default: 'any',
  choices: [
    { value: 'any', label: 'Anywhere' },
    { value: 'low', label: 'Frets 0–5' },
    { value: 'mid', label: 'Frets 4–9' },
    { value: 'high', label: 'Frets 7–12' },
    { value: 'travel', label: 'Move up each time round' },
  ],
};

export const BACKING = {
  id: 'backing',
  label: 'Backing chord',
  default: 'on',
  choices: [
    { value: 'on', label: 'Strum each bar' },
    { value: 'off', label: 'Off' },
  ],
};

const WINDOW = { any: [0, 12], low: [0, 5], mid: [4, 9], high: [7, 12] };
const TRAVEL = ['low', 'mid', 'high'];
const WANTED = { roots: ['root'], guide: ['third', 'seventh'] };
const INVERSION = ['root position', '1st inversion', '2nd inversion'];
const TRIADS = ['maj', 'min', 'dim', 'aug'].map(chordById);

const centre = (frets) => {
  const used = frets.filter((f) => f >= 0);
  return used.reduce((a, b) => a + b, 0) / used.length;
};
const nearest = (list, value, target) => list.reduce((best, item) => (Math.abs(value(item) - target) < Math.abs(value(best) - target) ? item : best));

// The triad inside a bigger chord (G7 → G, Dm7 → Dm), or nothing for sus chords.
const triadOf = (type) => TRIADS.find((t) => [1, 2].every((i) => t.formula[i].semitones === type.formula[i]?.semitones));

//   chord, key    what to play, and the key it sits in (its scale is drawn faintly under the chord tones)
//   offset        the beat of the bar this chord starts on, for chords that share a bar
//   memo.pass     how many times round so far: "Move up each time round" uses it
//   below         optional () => element drawn under the chord, such as a song chart
export function chordStep({ chord, key, beats, offset = 0, title, detail, peek, opts, e, memo, below }) {
  const tuning = e.tuning.midi;
  const where = opts.position === 'travel' ? TRAVEL[(memo.pass ?? 0) % 3] : opts.position;
  const [from, to] = WINDOW[where];
  const single = ['roots', 'guide', 'tones'].includes(opts.show); // single notes on the neck, not a grip

  // The grip: shown for shapes and triads, and strummed as backing either way.
  const grips = voicings(tuning, pc(chord.root), chord.type);
  let frets = bestVoicing(grips, where === 'any' ? null : from + 1)?.frets ?? null;
  let caption = '';
  const triad = opts.show === 'triads' && triadOf(chord.type);
  if (triad) {
    // In a fixed position take the shape that lives there; otherwise the one nearest the last chord.
    const target = where === 'any' ? (memo.centre ?? 5) : (from + to) / 2;
    const shape = nearest(triadShapes(tuning, pc(chord.root), triad, tuning.length - 3), (sh) => centre(sh.frets), target);
    memo.centre = centre(shape.frets);
    frets = shape.frets;
    caption = INVERSION[shape.inversion];
  }

  // Single-note views: which chord tones count.
  let wanted = chord.tones.filter((t) => !WANTED[opts.show] || WANTED[opts.show].includes(t.interval.role));
  if (!wanted.length) wanted = chord.tones;
  const targets = new Set(wanted.map((t) => pc(t.note)));
  let drawn = false;
  let landed = false;

  // Chord views with the microphone on: the grip asked for (the triad itself in Triads), judged as it rings.
  const asked = triad ? spellChord(pc(chord.root), triad) : chord;
  let reading = null; // a running blend of what the microphone hears, started afresh for each chord
  let streak = 0; // frames in a row that matched
  const spelled = (p) => asked.tones.find((t) => pc(t.note) === p);
  const onTime = Math.min(2, beats); // beats in which a change still counts as on time
  const strayName = (p) => {
    const inKey = key?.scale.find((t) => pc(t.note) === p);
    return inKey ? noteName(inKey.note) : pcName(p, 'flat');
  };

  return {
    beats,
    offset,
    title,
    peek,
    detail: () => [detail, caption, memo.listening && memo.changes ? `${memo.landed ?? 0} of ${memo.changes} ${single ? 'landed' : 'on time'}` : ''].filter(Boolean).join(' · '),
    draw(el) {
      if (drawn) return;
      drawn = true;
      if (memo.listening) memo.changes = (memo.changes ?? 0) + 1;
      let picture;
      if (single) {
        const dots =
          opts.show === 'tones' && key
            ? chordOverScaleDots(tuning, key.scale, chord, { labels: e.labels, to })
            : toneDots(tuning, wanted, { to, labels: e.labels });
        picture = Fretboard({ tuning, from, to, lefty: e.lefty, dots, label: chord.name });
      } else if (frets) {
        picture = h('div', { class: 'center' }, ChordDiagram({ frets, info: toneInfo(tuning, chord.tones, e.labels), lefty: e.lefty, scale: below ? 1.35 : 1.7, label: chord.name }));
      } else {
        picture = h('p', { class: 'muted center' }, 'No comfortable grip in this tuning: play the chord tones.');
      }
      el.replaceChildren(...[picture, below?.()].filter(Boolean));
    },
    sound(b, at) {
      // With the microphone on, the backing would be heard as your playing: leave it out.
      if (opts.backing !== 'on' || !frets || memo.listening) return;
      if (b === 0 || (b + offset) % 4 === 0) strum(midisOf(tuning, frets), 0, { at, gain: 0.22 });
    },
    // Microphone: did you land on a wanted note as the chord arrived?
    hear: single
      ? (midi, b) => {
          if (landed || b >= Math.min(2, beats) || !targets.has(midi % 12)) return;
          landed = true;
          memo.landed = (memo.landed ?? 0) + 1;
        }
      : undefined,
    // Microphone, chord views: is the whole chord ringing, cleanly, by the time the click says change?
    // Returns the line to show under the prompt: { text, ok }.
    hearChord: single
      ? undefined
      : (frame, b) => {
          if (!frame) {
            streak = 0;
            return landed ? null : { text: 'Listening: strum the chord' };
          }
          reading = blend(reading, frame, 0.35);
          const judged = judgeChord(reading, pc(asked.root), asked.type);
          streak = judged.clean ? streak + 1 : 0;
          // Two readings in a row, so the last chord still ringing or one lucky frame does not count.
          if (streak >= 2 && !landed) {
            landed = b < onTime ? 'on time' : 'late';
            if (landed === 'on time') memo.landed = (memo.landed ?? 0) + 1;
          }
          if (judged.clean) return { text: landed === 'late' ? `${asked.name}: clean, but late. Change on the click` : `${asked.name}: clean`, ok: true };
          if (landed) return null; // got it already: a fading chord is not a mistake
          const heard = spellChord(judged.best.root, judged.best.type).name;
          const gone = judged.missing.map(spelled).filter(Boolean)[0];
          const stray = judged.extra[0];
          const hint = gone ? `no ${noteName(gone.note)}, the ${degreeName(gone.interval)}` : stray != null ? `${strayName(stray)} is not in ${asked.name}` : 'not clean yet';
          return { text: `Heard ${heard === asked.name ? asked.name : `${heard}, not ${asked.name}`} · ${hint}`, ok: false };
        },
  };
}

// '3' → '3rd', '♭7' → '♭7th', 'R' → 'root'
const degreeName = (interval) => (interval.label === 'R' ? 'root' : interval.label + ({ 1: 'st', 2: 'nd', 3: 'rd' }[interval.degree] ?? 'th'));
