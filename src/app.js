import { h, replay } from './ui/dom.js';
import { icon } from './ui/icons.js';
import { Segmented, Select, openSheet } from './ui/controls.js';
import { settings, setSetting, onSettings } from './state/settings.js';
import { resetProgress } from './state/progress.js';
import { TUNINGS } from './theory/index.js';
import { DRILLS } from './drills/index.js';
import { runSession } from './drills/session.js';
import { TrainView } from './views/train.js';
import { NeckView } from './views/neck.js';
import { ChordsView } from './views/chords.js';
import { KeysView } from './views/keys.js';
import { PlayView } from './views/play.js';
import { runPlay } from './play/runner.js';
import { runFree } from './play/free.js';
import { SESSION } from './play/index.js';

// Each tab is a function (root, app) that draws itself. To add a tab, add a line here.
const TABS = [
  { id: 'train', label: 'Train', view: TrainView },
  { id: 'play', label: 'Play', icon: 'metronome', view: PlayView },
  { id: 'neck', label: 'Neck', view: NeckView },
  { id: 'chords', label: 'Chords', view: ChordsView },
  { id: 'keys', label: 'Keys', view: KeysView },
];

const main = h('main', { class: 'view' });
const nav = h('nav', { class: 'tabs', 'aria-label': 'Sections' });
const session = h('div', { class: 'session', hidden: true });
document.getElementById('app').append(main, nav, session);

let current = TABS[0];
let inSession = false;
let entered = 0;

const app = {
  // Redraw the current tab in place, keeping the scroll position.
  refresh() {
    if (inSession) return;
    const y = window.scrollY;
    main.replaceChildren();
    current.view(main, app);
    nav.replaceChildren(
      h(
        'div',
        { class: 'tabs-inner' },
        TABS.map((t) => h('button', { type: 'button', class: 'tab', 'aria-current': t === current ? 'page' : null, onclick: () => go(t.id) }, icon(t.icon ?? t.id), t.label)),
      ),
    );
    window.scrollTo(0, y);
  },
  startDrill: (drill) => start({ drills: [drill], title: drill.title }),
  startMix: () => start({ drills: DRILLS.filter((d) => settings.sound || !d.needsSound), title: 'Today’s mix' }),
  startPlay: (mode) => start({ blocks: [{ mode }], title: mode.title }, runPlay),
  startSession: () => start({ blocks: SESSION, title: 'Daily session' }, runPlay),
  startFree: () => start({}, runFree),
  openSettings,
};

function go(id) {
  current = TABS.find((t) => t.id === id) ?? TABS[0];
  try {
    if (location.hash.slice(1) !== current.id) location.hash = current.id;
  } catch {
    /* some viewers lock the address: tabs still work */
  }
  app.refresh();
  replay(main, 'view-enter');
  clearTimeout(entered);
  entered = setTimeout(() => main.classList.remove('view-enter'), 500); // so later redraws in place do not animate
  window.scrollTo(0, 0);
}

function start(config, runner = runSession) {
  inSession = true;
  main.hidden = nav.hidden = true;
  session.hidden = false;
  runner(session, {
    ...config,
    onExit() {
      inSession = false;
      session.hidden = true;
      session.replaceChildren();
      main.hidden = nav.hidden = false;
      app.refresh();
    },
  });
}

function openSettings() {
  let confirming = false;
  const field = (label, control) => h('div', { class: 'field' }, h('p', { class: 'field-label' }, label), control);
  openSheet('Settings', (body, rebuild) => {
    body.append(
      Select({ id: 'set-tuning', label: 'Tuning', value: settings.tuning, onChange: (v) => setSetting('tuning', v), groups: [{ options: TUNINGS.map((t) => ({ value: t.id, label: t.name })) }] }),
      field(
        'Neck',
        Segmented({
          label: 'Handedness',
          value: settings.lefty,
          onChange: (v) => (setSetting('lefty', v), rebuild()),
          options: [
            { value: false, label: 'Right-handed' },
            { value: true, label: 'Left-handed' },
          ],
        }),
      ),
      field(
        'Accidentals',
        Segmented({
          label: 'Accidentals',
          value: settings.accidentals,
          onChange: (v) => (setSetting('accidentals', v), rebuild()),
          options: [
            { value: 'both', label: 'Both' },
            { value: 'sharp', label: 'Sharps ♯' },
            { value: 'flat', label: 'Flats ♭' },
          ],
        }),
      ),
      field(
        'Sound',
        Segmented({
          label: 'Sound',
          value: settings.sound,
          onChange: (v) => (setSetting('sound', v), rebuild()),
          options: [
            { value: true, label: 'On' },
            { value: false, label: 'Off' },
          ],
        }),
      ),
      field(
        'Progress',
        h(
          'button',
          {
            type: 'button',
            class: `btn${confirming ? ' btn-danger' : ''}`,
            onclick: () => {
              if (confirming) {
                resetProgress();
                app.refresh();
              }
              confirming = !confirming;
              rebuild();
            },
          },
          confirming ? 'Tap again to erase all progress' : 'Reset progress',
        ),
      ),
    );
  });
}

onSettings(() => app.refresh());
window.addEventListener('hashchange', () => {
  const id = location.hash.slice(1);
  if (id !== current.id && TABS.some((t) => t.id === id)) go(id);
});
go(location.hash.slice(1));
