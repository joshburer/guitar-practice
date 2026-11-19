import { test } from 'node:test';
import assert from 'node:assert/strict';
import { noteTracker, FRAME, HOP_MS } from '../src/audio/pitch.js';
import { pluckedNote } from './guitar-sim.js';

// Run the tracker over a recording the way the microphone loop does; returns [{ midi, ms }] after the pluck.
function hear(signal, rate, at) {
  const track = noteTracker(rate);
  const hop = Math.round((rate * HOP_MS) / 1000);
  const events = [];
  for (let end = FRAME; end <= signal.length; end += hop) {
    const midi = track(signal.subarray(end - FRAME, end));
    if (midi !== undefined && end / rate >= at) events.push({ midi, ms: (end / rate - at) * 1000 });
  }
  return events;
}

for (const rate of [44100, 48000]) {
  test(`the tracker names every fret of every string, first time, at ${rate} Hz`, () => {
    for (let midi = 40; midi <= 86; midi += 2) {
      const [first] = hear(pluckedNote(midi, { rate, seed: midi }), rate, 0.3);
      assert.equal(first?.midi, midi, `MIDI ${midi}`);
    }
  });
}

test('high notes are heard quickly, and quiet ones are still heard', () => {
  for (const midi of [64, 69, 76, 81, 88]) {
    const [loud] = hear(pluckedNote(midi, { seed: midi }), 48000, 0.3);
    assert.equal(loud?.midi, midi, `MIDI ${midi}`);
    assert.ok(loud.ms <= 80, `MIDI ${midi} took ${loud.ms.toFixed(0)} ms`);
    const [quiet] = hear(pluckedNote(midi, { amp: 0.012, seed: midi }), 48000, 0.3);
    assert.equal(quiet?.midi, midi, `quiet MIDI ${midi}`);
  }
});

test('the tracker stays silent on room noise and reports when a note has died away', () => {
  assert.deepEqual(hear(pluckedNote(64, { amp: 0, seconds: 1.5 }), 48000, 0), []);
  const events = hear(pluckedNote(76, { seconds: 4, amp: 0.03 }), 48000, 0.3);
  assert.equal(events[0].midi, 76);
  assert.equal(events.at(-1).midi, null);
});
