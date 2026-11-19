import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../src/theory/index.js';

const names = (tones) => tones.map((t) => T.noteName(t.note)).join(' ');
const std = T.tuningById('standard').midi;
const shapes = (root, id) => T.voicings(std, T.pc(T.parseNote(root)), T.chordById(id)).map((v) => v.frets.map((f) => (f < 0 ? 'x' : f)).join(' '));

test('spelling follows the letter names', () => {
  assert.equal(names(T.makeKey('F♯', 'major').scale), 'F♯ G♯ A♯ B C♯ D♯ E♯');
  assert.equal(names(T.makeKey('E♭', 'major').scale), 'E♭ F G A♭ B♭ C D');
  assert.equal(names(T.makeKey('C♯', 'minor').scale), 'C♯ D♯ E F♯ G♯ A B');
  assert.equal(names(T.chordOn(T.parseNote('Eb'), T.chordById('7')).tones), 'E♭ G B♭ D♭');
  assert.equal(T.spellChord(1, T.chordById('maj')).name, 'D♭');
  assert.equal(T.spellChord(1, T.chordById('min')).name, 'C♯m');
  assert.equal(T.spellChord(8, T.chordById('m7')).name, 'G♯m7');
  assert.equal(names(T.spellChord(1, T.chordById('dim7')).tones), 'C♯ E G B♭');
});

test('diatonic chords come from stacking thirds', () => {
  const a = T.makeKey('A', 'major');
  assert.deepEqual(T.diatonic(a).map((c) => c.name), ['A', 'Bm', 'C♯m', 'D', 'E', 'F♯m', 'G♯°']);
  assert.deepEqual(T.diatonic(a).map((c) => c.roman), ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
  assert.deepEqual(T.diatonic(T.makeKey('C'), true).map((c) => c.name), ['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7♭5']);
  assert.deepEqual(T.diatonic(T.makeKey('A', 'minor')).map((c) => c.roman), ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']);
  assert.equal(T.signature(a), '3♯');
  assert.equal(T.signature(T.makeKey('B♭')), '2♭');
  assert.equal(T.relative(a).name, 'F♯ minor');
  assert.equal(T.resolveStep(T.makeKey('G'), { deg: 6, type: 'maj', alter: -1 }).name, 'F');
  assert.equal(T.resolveStep(T.makeKey('G'), { deg: 6, type: 'maj', alter: -1 }).roman, '♭VII');
});

test('identify names chords and uses the bass to break ties', () => {
  const id = (text, bass) => T.identify(text.split(' ').map((n) => T.pc(T.parseNote(n))), T.pc(T.parseNote(bass)))[0].name;
  assert.equal(id('C E G', 'C'), 'C');
  assert.equal(id('C E G', 'E'), 'C/E');
  assert.equal(id('C E G A', 'C'), 'C6');
  assert.equal(id('C E G A', 'A'), 'Am7');
  assert.equal(id('G B F', 'G'), 'G7');
  assert.equal(id('E G# B D F##', 'E'), 'E7♯9');
  assert.equal(id('B D F A', 'B'), 'Bm7♭5');
});

test('voicing generator finds the shapes every guitarist knows', () => {
  const expectShape = (root, id, shape) => assert.ok(shapes(root, id).includes(shape), `${root}${id}: ${shape} not in ${JSON.stringify(shapes(root, id))}`);
  expectShape('C', 'maj', 'x 3 2 0 1 0');
  expectShape('C', 'maj', 'x 3 5 5 5 3');
  expectShape('C', 'maj', '8 10 10 9 8 8');
  expectShape('G', 'maj', '3 2 0 0 0 3');
  expectShape('D', 'maj', 'x x 0 2 3 2');
  expectShape('A', 'min', 'x 0 2 2 1 0');
  expectShape('E', 'maj', '0 2 2 1 0 0');
  expectShape('F', 'maj', '1 3 3 2 1 1');
  expectShape('B', 'min', 'x 2 4 4 3 2');
  expectShape('C', '7', 'x 3 2 3 1 0');
  expectShape('G', '7', '3 2 0 0 0 1');
  expectShape('D', 'm7', 'x x 0 2 1 1');
  expectShape('C', 'maj7', 'x 3 2 0 0 0');
  expectShape('E', '7#9', 'x 7 6 7 8 x');
});

test('triads sit on three adjacent strings in each inversion', () => {
  const c = T.triadShapes(std, 0, T.chordById('maj'), 3).map((t) => t.frets.slice(3).join(' '));
  assert.deepEqual(c, ['5 5 3', '9 8 8', '0 1 0']);
});

test('pitch detection hears guitar notes at the right octave', async () => {
  const { detectPitch, midiOf } = await import('../src/audio/pitch.js');
  const rate = 48000;
  // A plucked string: strong harmonics, decaying, a little noise. Harmonics are what cause octave errors.
  const tone = (hz) => Float32Array.from({ length: 4096 }, (_, i) => {
    const t = i / rate;
    let v = 0;
    for (let k = 1; k <= 8; k++) v += (Math.sin(2 * Math.PI * hz * k * t) / k) * Math.exp(-t * k * 3);
    return v * 0.3 + (Math.random() - 0.5) * 0.01;
  });
  for (const midi of [38, 40, 45, 50, 55, 59, 64, 69, 76, 81]) {
    const hz = 440 * 2 ** ((midi - 69) / 12);
    assert.equal(midiOf(detectPitch(tone(hz), rate)), midi, `MIDI ${midi}`);
  }
  assert.equal(detectPitch(new Float32Array(4096), rate), null);
  assert.equal(detectPitch(Float32Array.from({ length: 4096 }, () => (Math.random() - 0.5) * 0.4), rate), null);
});

test('every song parses, fills whole bars and transposes cleanly', () => {
  for (const s of T.SONGS) {
    const home = T.songChords(s);
    const bars = home.reduce((sum, c) => sum + c.beats, 0) / 4;
    assert.ok(Number.isInteger(bars) && bars % 4 === 0, `${s.title}: ${bars} bars`);
    assert.ok(home.every((c) => [1, 2, 4].includes(c.beats)), `${s.title}: odd bar split`);
    assert.equal(T.pc(T.songKey(s).tonic), T.songTonic(s), s.title);
    // moving the song moves every chord by the same amount and keeps its numerals
    const moved = T.songChords(s, T.songTonic(s) + 5);
    moved.forEach((c, i) => {
      assert.equal(T.mod(T.pc(c.chord.root) - T.pc(home[i].chord.root), 12), 5, s.title);
      assert.equal(c.roman, home[i].roman, s.title);
    });
  }
  const blues = T.songChords(T.songById('blues'), 0).map((c) => `${c.chord.name} ${c.roman}`);
  assert.deepEqual(blues.slice(0, 2), ['C7 I7', 'F7 IV7']);
});
