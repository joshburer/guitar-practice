import { Fretboard } from '../ui/fretboard.js';
import { NotePad } from '../ui/controls.js';
import { pcAt, pcName } from '../theory/index.js';
import { pluck } from '../audio/synth.js';
import { NECK_OPTIONS, neckPool, fretRange, stringLabel } from './common.js';

export default {
  id: 'name-note',
  group: 'Fretboard',
  neck: true,
  title: 'Name the note',
  blurb: 'See a spot on the neck, name it.',
  tip: 'Use landmarks rather than counting up from the nut: the open strings, frets 5 and 7, the octave at 12, and the octave shape two strings over.',
  options: NECK_OPTIONS,
  pool: neckPool,

  build(key, opts, e) {
    const [string, fret] = key.split(':').map(Number);
    const p = pcAt(e.tuning.midi, string, fret);
    return { key, string, fret, pc: p, label: `${stringLabel(e, string)}, fret ${fret}: ${pcName(p)}` };
  },

  render(q, ui) {
    const { tuning, lefty, accidentals } = ui.env;
    const [from, to] = fretRange(ui.opts);
    ui.prompt('Which note?', `${stringLabel(ui.env, q.string)}, fret ${q.fret}`);

    const draw = (dot) => ui.stage.replaceChildren(Fretboard({ tuning: tuning.midi, from, to, lefty, dots: [{ string: q.string, fret: q.fret, ...dot }] }));
    const pad = NotePad({
      accidentals,
      onPick(p, button) {
        if (ui.locked) return;
        const ok = p === q.pc;
        pluck(tuning.midi[q.string] + q.fret);
        button.classList.add(ok ? 'is-ok' : 'is-bad');
        if (!ok) pad.button(q.pc).classList.add('is-reveal');
        draw({ label: pcName(q.pc, accidentals === 'flat' ? 'flat' : 'sharp'), role: ok ? 'ok' : 'reveal' });
        ui.done(ok, ok ? '' : `That is ${pcName(q.pc)}.`);
      },
    });
    ui.answers.append(pad);
    draw({ label: '?', role: 'q' });
  },
};
