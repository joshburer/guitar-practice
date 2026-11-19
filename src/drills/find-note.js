import { Fretboard } from '../ui/fretboard.js';
import { pcAt, pcName } from '../theory/index.js';
import { pluck } from '../audio/synth.js';
import { NECK_OPTIONS, neckPool, fretRange, stringLabel, spellPc } from './common.js';

export default {
  id: 'find-note',
  group: 'Fretboard',
  neck: true,
  title: 'Find the note',
  blurb: 'See a note name, tap it on the string.',
  tip: 'Say each note out loud as you tap it.',
  options: NECK_OPTIONS,
  pool: neckPool,

  build(key, opts, e) {
    const [string, fret] = key.split(':').map(Number);
    const name = spellPc(pcAt(e.tuning.midi, string, fret), e);
    return { key, string, fret, name, label: `${name} on the ${stringLabel(e, string)}: fret ${fret}` };
  },

  render(q, ui) {
    const { tuning, lefty } = ui.env;
    const [from, to] = fretRange(ui.opts);
    const target = pcAt(tuning.midi, q.string, q.fret);
    ui.prompt(q.name, `on the ${stringLabel(ui.env, q.string)}`);

    const draw = (dots = []) =>
      ui.stage.replaceChildren(Fretboard({ tuning: tuning.midi, from, to, dots, lefty, strings: [q.string], onTap: tap, label: 'Tap the note on the neck' }));

    function tap({ fret }) {
      if (ui.locked) return;
      pluck(tuning.midi[q.string] + fret);
      const tapped = pcAt(tuning.midi, q.string, fret);
      const ok = tapped === target;
      const dots = [{ string: q.string, fret: ok ? fret : q.fret, label: q.name, role: 'ok' }];
      if (!ok) dots.push({ string: q.string, fret, label: pcName(tapped, 'sharp'), role: 'bad' });
      draw(dots);
      ui.done(ok, ok ? '' : `That was ${pcName(tapped)}. ${q.name} is at fret ${q.fret}.`);
    }
    draw();
  },
};
