import { h } from '../ui/dom.js';
import { NotePad } from '../ui/controls.js';
import { chordById, spellChord, pc, noteName } from '../theory/index.js';
import { run } from '../audio/synth.js';
import { CHORD_SET_OPTION, chordPool } from './name-chord.js';
import { spelled } from './common.js';

export default {
  id: 'spell-chord',
  group: 'Chords',
  title: 'Spell the chord',
  blurb: 'See a chord symbol, pick its notes.',
  tip: 'Think in formulas: major is R 3 5, minor flattens the 3rd.',
  options: [CHORD_SET_OPTION],
  pool: chordPool,

  build(key) {
    const [p, id] = key.split(':');
    const chord = spellChord(Number(p), chordById(id));
    return { key, chord, label: `${chord.name} = ${spelled(chord.tones)}` };
  },

  render(q, ui) {
    const picked = new Set();
    ui.prompt(q.chord.name, `${q.chord.type.name}: pick its ${q.chord.tones.length} notes`);

    const formula = (revealed) =>
      ui.stage.replaceChildren(
        h(
          'div',
          { class: 'tones tones-big' },
          q.chord.tones.map((t) => h('span', { class: `tone ${revealed ? `role-${t.interval.role}` : 'tone-blank'}` }, h('b', {}, revealed ? noteName(t.note) : '·'), h('small', {}, t.interval.label))),
        ),
      );

    const check = h('button', { type: 'button', class: 'btn btn-primary btn-wide', disabled: true, onclick: submit }, 'Check');
    const pad = NotePad({
      accidentals: ui.env.accidentals,
      onPick(p, button) {
        if (ui.locked) return;
        picked.has(p) ? picked.delete(p) : picked.add(p);
        button.classList.toggle('is-on', picked.has(p));
        check.disabled = picked.size < 2;
      },
    });

    function submit() {
      if (ui.locked) return;
      const ok = picked.size === q.chord.pcs.size && [...picked].every((p) => q.chord.pcs.has(p));
      for (const p of picked) {
        pad.button(p).classList.remove('is-on');
        pad.button(p).classList.add(q.chord.pcs.has(p) ? 'is-ok' : 'is-bad');
      }
      for (const p of q.chord.pcs) if (!picked.has(p)) pad.button(p).classList.add('is-reveal');
      check.hidden = true;
      formula(true);
      run(q.chord.tones.map((t) => 48 + pc(q.chord.root) + t.interval.semitones), 0.16);
      ui.done(ok, ok ? '' : q.label);
    }

    ui.answers.append(pad, check);
    formula(false);
  },
};
