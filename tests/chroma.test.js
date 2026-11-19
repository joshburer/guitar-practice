import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/theory/index.js';
import { chromaOf, judgeChord, fits, blend } from '../src/audio/chroma.js';
import { strumSamples, brightStrum } from './guitar-sim.js';

const std = T.tuningById('standard').midi;
const midis = (shape) => shape.split(' ').map((f, s) => (f === 'x' ? null : std[s] + Number(f))).filter((m) => m != null);
const hear = (shape, gen = strumSamples, seed = 3) => chromaOf(gen(midis(shape), { seed }), gen === strumSamples ? 48000 : 44100);
const judge = (reading, root, id) => judgeChord(reading, T.pc(T.parseNote(root)), T.chordById(id));
const best = (reading) => T.spellChord(fits(reading)[0].root, fits(reading)[0].type).name;

const GRIPS = [
  ['x 3 2 0 1 0', 'C', 'maj'],
  ['x 0 2 2 1 0', 'A', 'min'],
  ['3 2 0 0 0 3', 'G', 'maj'],
  ['3 2 0 0 0 1', 'G', '7'],
  ['1 3 3 2 1 1', 'F', 'maj'],
  ['0 2 2 0 0 0', 'E', 'min'],
  ['x x 0 2 3 2', 'D', 'maj'],
  ['x x 0 2 1 1', 'D', 'm7'],
  ['x 3 2 0 0 0', 'C', 'maj7'],
  ['x 1 3 3 3 1', 'Bb', 'maj'],
  ['x 0 2 0 2 0', 'A', '7'],
  ['x 3 5 5 4 3', 'C', 'min'],
  ['x x x 5 5 3', 'C', 'maj'],
];

test('chord detection hears common grips', () => {
  for (const [shape, root, id] of GRIPS) {
    for (const gen of [strumSamples, brightStrum]) {
      const reading = hear(shape, gen);
      const name = T.spellChord(T.pc(T.parseNote(root)), T.chordById(id)).name;
      // The darker Karplus–Strong string can leave a 7th's worth of overtone: judge it, but only name the bright one.
      if (gen === brightStrum) assert.equal(best(reading), name, shape);
      assert.ok(judge(reading, root, id).clean, `${shape} should be a clean ${name}`);
    }
  }
});

test('chord detection catches the wrong chord', () => {
  const c = hear('x 3 2 0 1 0');
  assert.ok(!judge(c, 'C', 'min').clean, 'C is not Cm');
  assert.ok(!judge(c, 'A', 'min').clean, 'C is not Am');
  assert.ok(!judge(c, 'F', 'maj').clean, 'C is not F');
  const g = hear('3 2 0 0 0 3');
  const g7 = judge(g, 'G', '7');
  assert.ok(!g7.clean, 'G is not G7');
  assert.deepEqual(g7.missing, [5], 'G7 without its F');
  assert.ok(!judge(hear('x 0 2 2 1 0'), 'C', 'maj').clean, 'Am is not C');
  assert.ok(!judge(hear('0 2 2 1 0 0'), 'E', 'min').clean, 'E is not Em');
});

test('chord detection accepts most voicings of everyday chords', () => {
  let tried = 0;
  let clean = 0;
  for (const id of ['maj', 'min', '7', 'm7', 'maj7']) {
    for (let root = 0; root < 12; root++) {
      for (const v of T.voicings(std, root, T.chordById(id)).slice(0, 3)) {
        const shape = v.frets.map((f) => (f < 0 ? 'x' : f)).join(' ');
        tried++;
        if (judgeChord(hear(shape, brightStrum, root + 7), root, T.chordById(id)).clean) clean++;
      }
    }
  }
  assert.ok(clean / tried > 0.9, `${clean} of ${tried} voicings judged clean`);
});

test('chord detection ignores silence and blends readings', () => {
  assert.equal(chromaOf(new Float32Array(16384), 48000), null);
  const c = hear('x 3 2 0 1 0');
  const am = hear('x 0 2 2 1 0');
  // The old chord still ringing is soon outweighed by the new one.
  let running = blend(null, c);
  for (let i = 0; i < 3; i++) running = blend(running, am, 0.35);
  assert.ok(judge(running, 'A', 'min').clean);
});
