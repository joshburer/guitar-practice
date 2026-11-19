import { h, replay } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { Fretboard } from '../ui/fretboard.js';
import { env } from '../state/settings.js';
import { logPlay } from '../state/progress.js';
import { unlock } from '../audio/synth.js';
import { listen } from '../audio/listen.js';
import { pcName, mod } from '../theory/index.js';
import { range } from '../util.js';

// Free play: no click and no prompts. Play anything and the note you played is named and shown on the neck:
// every place that exact pitch can be fretted, with the same note in other octaves drawn faintly.

const TOP = 22; // the highest fret looked at
const TRAIL = 8; // how many recent notes stay listed

export function runFree(host, { onExit }) {
  unlock();
  const e = env();
  const tuning = e.tuning.midi;
  const style = e.accidentals === 'both' ? undefined : e.accidentals;
  const began = performance.now();
  let stopMic = null;
  let wake = null;
  let trail = []; // MIDI notes, oldest first

  const main = h('h2', { class: 'prompt-main' });
  const sub = h('p', { class: 'prompt-sub' });
  const stage = h('div', { class: 'stage' });
  const recent = h('div', { class: 'trail', 'aria-label': 'Notes played' });
  const live = h('i', { class: 'live' });
  const screen = h(
    'div',
    { class: 'drill play free' },
    h('div', { class: 'drill-top' }, h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Stop playing', onclick: exit }, icon('close')), h('p', { class: 'drill-title' }, 'Free play'), live),
    h('div', { class: 'prompt', 'aria-live': 'polite' }, main, sub),
    stage,
    recent,
  );
  host.replaceChildren(screen);

  const neck = (dots, from = 0, to = 12) => stage.replaceChildren(Fretboard({ tuning, from, to, lefty: e.lefty, dots, label: 'Where the note is on the neck' }));

  function say(text, detail) {
    main.textContent = text;
    main.classList.toggle('prompt-long', text.length > 7);
    sub.replaceChildren(...[detail].flat());
  }

  // A settled note from the microphone, or null when the string stops ringing (the last note stays up to read).
  function heard(midi) {
    live.classList.toggle('is-on', midi != null);
    if (midi == null) return;
    const name = pcName(midi % 12, style);
    const places = tuning.flatMap((open, string) => (midi - open >= 0 && midi - open <= TOP ? [{ string, fret: midi - open }] : []));
    // Show the low half of the neck unless the note only lives above it.
    const [from, to] = !places.length || places.some((p) => p.fret <= 12) ? [0, 12] : [12, TOP];
    const others = tuning.flatMap((open, string) =>
      range(from, to)
        .filter((fret) => mod(open + fret - midi, 12) === 0 && open + fret !== midi)
        .map((fret) => ({ string, fret, label: name, role: 'ghost' })),
    );
    neck([...others, ...places.map((p) => ({ ...p, label: name, role: 'ok' }))], from, to);
    const shown = places.filter((p) => p.fret >= from && p.fret <= to).length;
    say(name, places.length ? `${name}${Math.floor(midi / 12) - 1} · ${shown} ${shown === 1 ? 'place' : 'places'} to play it` : 'Outside the range of this neck');
    replay(main, 'pop');

    trail = [...trail, midi].slice(-TRAIL);
    recent.replaceChildren(...trail.map((m, i) => h('span', { class: `tone${i === trail.length - 1 ? ' is-on' : ''}` }, h('b', {}, pcName(m % 12, style ?? 'sharp')))));
  }

  async function start() {
    say('Listening', 'Play any note');
    neck([]);
    try {
      stopMic = await listen(heard);
      screen.classList.add('is-listening');
    } catch {
      stopMic = null;
      say('No microphone', [
        'Free play needs to hear the guitar. ',
        h('button', { type: 'button', class: 'btn btn-small', onclick: start }, 'Try again'),
      ]);
    }
  }

  async function keepAwake() {
    try {
      wake = await navigator.wakeLock?.request('screen');
    } catch {
      /* not available here: the screen may dim */
    }
  }

  function exit() {
    stopMic?.();
    wake?.release?.().catch(() => {});
    if (screen.classList.contains('is-listening')) logPlay((performance.now() - began) / 1000);
    onExit();
  }

  keepAwake();
  start();
}
