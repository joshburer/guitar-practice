import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { PLAY_MODES, SESSION } from '../play/index.js';
import { settings, setSetting } from '../state/settings.js';
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
      h('h2', {}, `${total} minutes, hands-free`),
      h('ol', { class: 'mix-steps' }, SESSION.map((b) => h('li', {}, b.mode.title, h('small', {}, `${b.minutes} min`)))),
      h(
        'div',
        { class: 'mix-foot' },
        h('button', { type: 'button', class: 'btn btn-light', onclick: app.startSession }, 'Start'),
        h('p', { class: 'mix-count' }, minutes ? `${minutes} min played today` : ''),
      ),
    ),
    section(
      'Or just one',
      h(
        'div',
        { class: 'list' },
        PLAY_MODES.map((mode) =>
          h('button', { type: 'button', class: 'row row-plain', onclick: () => app.startPlay(mode) }, h('span', { class: 'row-text' }, h('b', {}, mode.title), h('span', {}, mode.blurb)), icon('chevron', 18)),
        ),
      ),
    ),
  );
  if (!settings.sound) {
    root.firstChild.after(h('p', { class: 'notice' }, 'Sound is off: no click, no answers.', h('button', { type: 'button', class: 'btn btn-small', onclick: () => setSetting('sound', true) }, 'Turn on')));
  }
}
