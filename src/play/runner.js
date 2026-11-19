import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { env } from '../state/settings.js';
import { load, save } from '../state/store.js';
import { logPlay } from '../state/progress.js';
import { optionsFor, openOptions } from '../drills/session.js';
import { unlock, audioNow, click } from '../audio/synth.js';
import { listen } from '../audio/listen.js';
import { pcName } from '../theory/index.js';

// Runs play-along modes hands-free: a click keeps time and the prompts move on by themselves.
// A mode supplies steps (see README); the runner owns the clock, tempo, pause, the microphone,
// moving between the blocks of a session, and keeping the screen awake.
//   blocks: [{ mode, minutes }]   one block with no `minutes` runs until stopped

const LOOKAHEAD = 0.12; // seconds of audio scheduled ahead of the clock
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function runPlay(host, { blocks, title, onExit }) {
  unlock();
  const prefs = { bpm: 70, click: true, mic: false, ...load('play', {}) };
  let block = 0;
  let blockPlayed = 0; // seconds of this block scheduled so far
  let totalPlayed = 0;
  let unlogged = 0;
  let e, opts, memo, step, upcoming, beat, nextBeatAt, ticker, wake;
  let paused = false;
  let pending = [];
  let shown = null; // the step and beat currently on screen
  let stopMic = null;
  let sounding = null; // the note the microphone hears right now
  const mode = () => blocks[block].mode;
  const limit = () => (blocks[block].minutes ?? Infinity) * 60;

  const heading = h('p', { class: 'drill-title' });
  const beats = h('div', { class: 'beats', 'aria-hidden': 'true' }, [0, 1, 2, 3].map(() => h('i')));
  const main = h('h2', { class: 'prompt-main' });
  const sub = h('p', { class: 'prompt-sub' });
  const stage = h('div', { class: 'stage' });
  const nextUp = h('p', { class: 'next-up' });
  const tempo = h('b', {});
  const pauseBtn = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => (paused ? resume() : pause()) });
  const clickBtn = h('button', { type: 'button', class: 'btn btn-toggle', onclick: toggleClick }, 'Click');
  const micBtn = h('button', { type: 'button', class: 'btn btn-toggle', onclick: toggleMic }, 'Mic');
  const micNote = h('p', { class: 'mic-note', role: 'status' });
  const screen = h(
    'div',
    { class: 'drill play' },
    h(
      'div',
      { class: 'drill-top' },
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Stop playing', onclick: exit }, icon('close')),
      heading,
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Options', onclick: options }, icon('settings')),
    ),
    beats,
    h('div', { class: 'prompt' }, main, sub),
    stage,
    nextUp,
    micNote,
    h(
      'div',
      { class: 'transport' },
      h(
        'div',
        { class: 'tempo' },
        h('button', { type: 'button', class: 'btn', 'aria-label': 'Slower', onclick: () => setTempo(-5) }, '−'),
        tempo,
        h('button', { type: 'button', class: 'btn', 'aria-label': 'Faster', onclick: () => setTempo(5) }, '+'),
      ),
      clickBtn,
      micBtn,
    ),
    pauseBtn,
  );
  host.replaceChildren(screen);

  const value = (field, b) => (typeof field === 'function' ? field(b) : field);

  // Everything that happens on screen for one beat.
  function show(s, b) {
    // A note still ringing as a new prompt arrives counts for it: a held common tone is a fine way to land.
    if (b === 0 && shown?.s !== s && sounding != null) s.hear?.(sounding, 0);
    if (shown?.s !== s) micNote.classList.remove('is-ok', 'is-bad');
    shown = { s, b };
    const text = value(s.title, b);
    main.textContent = text;
    main.classList.toggle('prompt-long', text.length > 7);
    sub.textContent = value(s.detail, b) ?? '';
    nextUp.textContent = s.next ? `Next: ${s.next}` : '';
    s.draw(stage, b);
    const inBar = (b + (s.offset ?? 0)) % 4;
    [...beats.children].forEach((dot, i) => dot.classList.toggle('is-on', i === inBar));
    const left = limit() - s.playedAt;
    heading.textContent = blocks.length > 1 ? `${title} · ${s.mode.title} · ${clock(Math.max(0, left))}` : s.mode.title;
  }

  // Count in, then the mode's first step.
  function prepare() {
    e = env();
    opts = optionsFor(mode(), e);
    memo = { listening: Boolean(stopMic) };
    upcoming = mode().next(opts, e, memo);
    if (!shown) heading.textContent = blocks.length > 1 ? title : mode().title;
    step = {
      intro: true,
      beats: 4,
      title: blocks.length > 1 ? mode().title : 'Ready',
      detail: `First up: ${upcoming.peek}`,
      draw: (el, b) => el.replaceChildren(h('p', { class: 'count-in' }, b + 1)),
    };
    beat = 0;
  }

  // Schedule audio a little ahead of the clock; queue the matching screen update for the same moment.
  function tick() {
    while (nextBeatAt < audioNow() + LOOKAHEAD) {
      const s = step;
      const b = beat;
      const length = 60 / prefs.bpm;
      s.mode ??= mode();
      if (b === 0) s.playedAt = blockPlayed;
      if (prefs.click) click(nextBeatAt, (b + (s.offset ?? 0)) % 4 === 0);
      s.sound?.(b, nextBeatAt);
      pending.push(setTimeout(() => show(s, b), Math.max(0, (nextBeatAt - audioNow()) * 1000)));
      nextBeatAt += length;
      if (!s.intro) {
        blockPlayed += length;
        totalPlayed += length;
        unlogged += length;
      }
      if (++beat < step.beats) continue;

      // End of a step: carry on, move to the next block of the session, or finish.
      logPlay(unlogged);
      unlogged = 0;
      if (blockPlayed < limit() || s.intro) {
        step = upcoming;
        upcoming = mode().next(opts, e, memo);
        step.next = upcoming.peek;
        beat = 0;
      } else if (block + 1 < blocks.length) {
        block++;
        blockPlayed = 0;
        prepare();
      } else {
        clearInterval(ticker);
        pending.push(setTimeout(finish, Math.max(0, (nextBeatAt - audioNow()) * 1000)));
        return;
      }
    }
  }

  function stopClock() {
    clearInterval(ticker);
    pending.forEach(clearTimeout);
    pending = [];
  }

  function startClock() {
    beat = 0;
    nextBeatAt = audioNow() + 0.15;
    ticker = setInterval(tick, 25);
    tick();
  }

  // Start the current block over from its count-in: at the start, and whenever its options change.
  function restart() {
    stopClock();
    prepare();
    setPaused(false);
    startClock();
  }

  function setPaused(now) {
    paused = now;
    pauseBtn.replaceChildren(paused ? 'Resume' : 'Pause');
    screen.classList.toggle('is-paused', paused);
    if (paused) wake?.release?.().catch(() => {});
    else keepAwake();
  }

  function pause() {
    stopClock();
    setPaused(true);
  }

  function resume() {
    setPaused(false);
    startClock(); // the current prompt starts over
  }

  function setTempo(change) {
    prefs.bpm = Math.max(40, Math.min(200, prefs.bpm + change));
    save('play', prefs);
    drawTransport();
  }

  function toggleClick() {
    prefs.click = !prefs.click;
    save('play', prefs);
    drawTransport();
  }

  function drawTransport() {
    tempo.replaceChildren(`${prefs.bpm}`, h('small', {}, 'bpm'));
    clickBtn.setAttribute('aria-pressed', String(prefs.click));
    micBtn.setAttribute('aria-pressed', String(Boolean(stopMic)));
  }

  // A settled note from the microphone: hand it to the step on screen, which decides what it means.
  function heard(midi) {
    sounding = midi;
    if (shown?.s.hearChord) return; // a chord step listens to chords instead
    micNote.textContent = midi == null ? 'Listening' : `Heard ${pcName(midi % 12)}`;
    if (midi == null || paused || !shown?.s.hear) return;
    shown.s.hear(midi, shown.b);
    show(shown.s, shown.b);
  }

  // A chord reading from the microphone, for steps that ask for a whole chord. The step judges it and says
  // what it heard; that line goes under the prompt, marked when the chord was clean.
  function heardChord(reading) {
    if (paused || !shown?.s.hearChord) return;
    const said = shown.s.hearChord(reading, shown.b);
    if (said) {
      micNote.textContent = said.text;
      micNote.classList.toggle('is-ok', Boolean(said.ok));
      micNote.classList.toggle('is-bad', said.ok === false);
    }
    show(shown.s, shown.b);
  }

  async function startMic() {
    try {
      stopMic = await listen(heard, heardChord);
      micNote.textContent = 'Listening: play and it is checked for you';
    } catch {
      stopMic = null;
      if (prefs.mic) micNote.textContent = 'No microphone here. It works when the app runs on its own site and you allow access.';
      prefs.mic = false; // do not ask again until the Mic button is tapped
      save('play', prefs);
    }
    if (memo) memo.listening = Boolean(stopMic);
    drawTransport();
  }

  function toggleMic() {
    prefs.mic = !stopMic;
    save('play', prefs);
    if (!stopMic) return startMic();
    stopMic();
    stopMic = null;
    sounding = null;
    micNote.textContent = '';
    micNote.classList.remove('is-ok', 'is-bad');
    memo.listening = false;
    drawTransport();
  }

  function options() {
    pause();
    openOptions(mode(), restart);
  }

  async function keepAwake() {
    try {
      wake = await navigator.wakeLock?.request('screen');
    } catch {
      /* not available here: the screen may dim */
    }
  }

  const onVisibility = () => {
    if (document.hidden && !paused) pause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  function cleanUp() {
    stopClock();
    logPlay(unlogged);
    unlogged = 0;
    stopMic?.();
    stopMic = null;
    wake?.release?.().catch(() => {});
    document.removeEventListener('visibilitychange', onVisibility);
  }

  function exit() {
    cleanUp();
    onExit();
  }

  function finish() {
    cleanUp();
    host.replaceChildren(
      h(
        'div',
        { class: 'drill summary' },
        h('p', { class: 'eyebrow' }, title),
        h('h2', { class: 'score' }, `${Math.round(totalPlayed / 60)}`, h('span', {}, ' min')),
        h('p', { class: 'muted' }, 'Session done. Tomorrow, nudge one thing: five more beats a minute, a new key, or a different part of the neck.'),
        h('div', { class: 'summary-actions' }, h('button', { type: 'button', class: 'btn btn-primary', onclick: onExit }, 'Done')),
      ),
    );
  }

  drawTransport();
  restart();
  if (prefs.mic) startMic();
}

