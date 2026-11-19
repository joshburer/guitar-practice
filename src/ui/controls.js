import { h } from './dom.js';
import { icon } from './icons.js';
import { pcName, isNatural } from '../theory/index.js';

// One-of-many picker. Pass `wrap` for long option lists, or `columns` to lay them out as a grid.
export function Segmented({ options, value, onChange, label, wrap = false, columns }) {
  return h(
    'div',
    {
      class: `seg${wrap ? ' seg-wrap' : ''}${columns ? ' seg-grid' : ''}`,
      role: 'radiogroup',
      'aria-label': label,
      style: columns && { gridTemplateColumns: `repeat(${columns}, 1fr)` },
    },
    options.map((o) =>
      h('button', { type: 'button', class: 'seg-btn', role: 'radio', 'aria-checked': String(o.value === value), onclick: () => onChange(o.value) }, o.label),
    ),
  );
}

// Twelve roots in a 6 × 2 grid. `names` are the labels for pitch classes 0–11.
export function RootPicker({ value, onChange, names, order = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], label = 'Root' }) {
  return h(
    'div',
    { class: 'roots', role: 'radiogroup', 'aria-label': label },
    order.map((p) =>
      h('button', { type: 'button', class: 'root-btn', role: 'radio', 'aria-checked': String(p === value), onclick: () => onChange(p) }, names[p]),
    ),
  );
}

export function Select({ id, label, groups, value, onChange }) {
  const select = h(
    'select',
    { id, onchange: () => onChange(select.value) },
    groups.map((g) => {
      const options = g.options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label));
      return g.label ? h('optgroup', { label: g.label }, options) : options;
    }),
  );
  return h('label', { class: 'select', for: id }, h('span', {}, label), select);
}

// Twelve notes laid out like a keyboard octave: the shape everyone already knows.
const COLUMN = { 0: 1, 2: 3, 4: 5, 5: 7, 7: 9, 9: 11, 11: 13, 1: 2, 3: 4, 6: 8, 8: 10, 10: 12 };

export function NotePad({ accidentals = 'both', onPick }) {
  const buttons = new Map();
  const el = h('div', { class: 'pad' });
  for (const p of [1, 3, 6, 8, 10, 0, 2, 4, 5, 7, 9, 11]) {
    const natural = isNatural(p);
    const names = natural || accidentals !== 'both' ? [pcName(p, accidentals)] : [pcName(p, 'sharp'), pcName(p, 'flat')];
    const button = h(
      'button',
      {
        type: 'button',
        class: `key ${natural ? 'key-natural' : 'key-accidental'}`,
        style: { gridColumn: `${COLUMN[p]} / span 2`, gridRow: natural ? '2' : '1' },
        onclick: () => onPick(p, button),
      },
      names.map((name) => h('span', {}, name)),
    );
    buttons.set(p, button);
    el.append(button);
  }
  el.button = (p) => buttons.get(p);
  return el;
}

// A grid of big answer buttons. choices: [{ value, label, hint }]
export function Choices({ choices, onPick, columns = 4 }) {
  const buttons = new Map();
  const el = h('div', { class: 'choices', style: { gridTemplateColumns: `repeat(${columns}, 1fr)` } });
  for (const c of choices) {
    const button = h('button', { type: 'button', class: 'choice', onclick: () => onPick(c.value, button) }, h('b', {}, c.label), c.hint && h('small', {}, c.hint));
    buttons.set(c.value, button);
    el.append(button);
  }
  el.button = (value) => buttons.get(value);
  return el;
}

// Bottom sheet. `build(body, rebuild)` fills it; returns a close function.
export function openSheet(title, build, onClose) {
  const body = h('div', { class: 'sheet-body' });
  const close = () => {
    backdrop.remove();
    onClose?.();
  };
  const rebuild = () => {
    body.replaceChildren();
    build(body, rebuild, close);
  };
  const sheet = h(
    'div',
    { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'sheet-head' }, h('h2', {}, title), h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Close', onclick: close }, icon('close'))),
    body,
  );
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: (e) => e.target === backdrop && close() }, sheet);
  rebuild();
  document.body.append(backdrop);
  return close;
}
