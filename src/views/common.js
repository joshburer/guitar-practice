import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { Segmented } from '../ui/controls.js';
import { settings, setSetting } from '../state/settings.js';
import { load, save } from '../state/store.js';

export const header = (title, app) =>
  h('header', { class: 'top' }, h('h1', {}, title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Settings', onclick: app.openSettings }, icon('settings')));

// Dots can show scale degrees or note names. One switch, remembered everywhere.
export const LabelToggle = () =>
  Segmented({
    label: 'Dot labels',
    options: [
      { value: 'degrees', label: 'Degrees' },
      { value: 'notes', label: 'Notes' },
    ],
    value: settings.labels,
    onChange: (value) => setSetting('labels', value),
  });

// Remembered selections for a view: const [state, set] = viewState('neck', defaults)
export function viewState(name, defaults, app) {
  const state = { ...defaults, ...load(`view:${name}`, {}) };
  const set = (patch) => {
    save(`view:${name}`, Object.assign(state, patch));
    app.refresh();
  };
  return [state, set];
}

export const section = (title, ...kids) => h('section', { class: 'section' }, title && h('h2', { class: 'eyebrow' }, title), kids);

export const playButton = (label, onclick) => h('button', { type: 'button', class: 'btn btn-play', onclick }, icon('play', 16), label);
