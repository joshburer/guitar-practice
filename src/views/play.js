import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { PLAY_MODES, SESSION } from '../play/index.js';
import { settings } from '../state/settings.js';
import { playedToday } from '../state/progress.js';
import { header, section } from './common.js';

// Guitar in hand, phone propped up: these run on a click and need no tapping once started.
export function PlayView(root, app) {
  const minutes = Math.round(playedToday() / 60);
  const total = SESSION.reduce((sum, b) => sum + b.minutes, 0);
  root.append(
    header('Play', app),
    h(
      'div',
      { class: 'mix' },
      h('p', { class: 'eyebrow' }, 'Daily session'),
      h('h2', {}, `${total} minutes, guitar in hand`),
      h('p', {}, `${SESSION.map((b) => `${b.mode.title} ${b.minutes}`).join(' → ')}. Prop the phone up: it counts you in, keeps time and moves on by itself.`),
      h(
        'div',
        { class: 'mix-foot' },
        h('button', { type: 'button', class: 'btn btn-light', onclick: app.startSession }, 'Start'),
        h('p', { class: 'mix-count' }, minutes ? `${minutes} min played today` : 'Nothing played yet today'),
      ),
    ),
    section(
      'Or pick one',
      h(
        'div',
        { class: 'list' },
        PLAY_MODES.map((mode) =>
          h('button', { type: 'button', class: 'row row-plain', onclick: () => app.startPlay(mode) }, h('span', { class: 'row-text' }, h('b', {}, mode.title), h('span', {}, mode.blurb)), icon('chevron', 18)),
        ),
      ),
    ),
    h(
      'p',
      { class: 'muted small' },
      settings.sound
        ? 'Start slow enough to play every prompt cleanly, then raise the tempo five beats at a time. Tempo, the click, the microphone and each mode’s options are on the play screen.'
        : 'Sound is off, so there is no click or answer to hear. Turn it on in settings.',
    ),
  );
}
