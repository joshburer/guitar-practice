import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { Segmented, Select, openSheet } from '../ui/controls.js';
import { env } from '../state/settings.js';
import { load, save } from '../state/store.js';
import { pick, record } from '../state/progress.js';
import { unlock } from '../audio/synth.js';
import { shuffle } from '../util.js';

// A drill is a plain object (see docs/overview.md): the session runner does everything around the question itself:
// choosing what to ask, timing, feedback, scoring and the end-of-round review.

export const choicesOf = (option, e) => (typeof option.choices === 'function' ? option.choices(e) : option.choices);

export function optionsFor(drill, e) {
  const saved = load('opts', {})[drill.id] ?? {};
  const opts = {};
  for (const o of drill.options ?? []) {
    opts[o.id] = choicesOf(o, e).some((c) => c.value === saved[o.id]) ? saved[o.id] : o.default;
  }
  return opts;
}

export function setOption(drill, id, value) {
  const all = load('opts', {});
  all[drill.id] = { ...all[drill.id], [id]: value };
  save('opts', all);
}

// Drills that depend on the tuning keep separate progress per tuning.
export const deckOf = (drill, e) => (drill.neck ? `${drill.id}@${e.tuning.id}` : drill.id);

// A few choices are buttons; a long list (songs, progressions, keys) is a native picker, grouped if the choices say so.
function picker(id, label, choices, value, onChange) {
  if (choices.length <= 8) return Segmented({ label, options: choices, value, wrap: true, onChange });
  const groups = [...new Set(choices.map((c) => c.group))].map((group) => ({ label: group, options: choices.filter((c) => c.group === group) }));
  return Select({ id: `opt-${id}`, label: '', groups, value, onChange });
}

// The options sheet for a drill or play mode: its coaching tip, then one picker per option.
export function openOptions(item, onClose) {
  return openSheet(
    item.title,
    (body, rebuild) => {
      const e = env();
      const opts = optionsFor(item, e);
      body.append(
        h('p', { class: 'tip' }, item.tip),
        ...item.options.map((o) =>
          h(
            'div',
            { class: 'field' },
            h('p', { class: 'field-label' }, o.label),
            picker(o.id, o.label, choicesOf(o, e), opts[o.id], (value) => {
              setOption(item, o.id, value);
              rebuild();
            }),
            o.note && h('p', { class: 'muted small' }, o.note(opts[o.id])),
          ),
        ),
      );
    },
    onClose,
  );
}

export function runSession(host, { drills, title, length = 20, onExit }) {
  unlock();
  let index = 0;
  let results = [];
  let lastKey = null;
  let timer = 0;
  const bag = [];
  const nextDrill = () => {
    if (!bag.length) bag.push(...shuffle(drills));
    return bag.pop();
  };
  const exit = () => {
    clearTimeout(timer);
    onExit();
  };

  function ask(drill = nextDrill()) {
    clearTimeout(timer);
    const e = env();
    const opts = optionsFor(drill, e);
    const deck = deckOf(drill, e);
    const key = pick(deck, drill.pool(opts, e), lastKey);
    const q = drill.build(key, opts, e);
    const started = performance.now();
    let locked = false;
    lastKey = key;

    const main = h('h2', { class: 'prompt-main' });
    const sub = h('p', { class: 'prompt-sub' });
    const stage = h('div', { class: 'stage' });
    const answers = h('div', { class: 'answers' });
    const note = h('p', { class: 'feedback', role: 'status' });
    const next = h('button', { type: 'button', class: 'btn btn-primary', hidden: true, onclick: advance }, 'Next');

    const ui = {
      env: e,
      opts,
      stage,
      answers,
      get locked() {
        return locked;
      },
      prompt(text, detail = '') {
        main.textContent = text;
        main.classList.toggle('prompt-long', text.length > 7);
        sub.textContent = detail;
      },
      // Call once with the result. `explain` is shown as feedback (always on a miss).
      done(correct, explain = '') {
        if (locked) return;
        locked = true;
        record(deck, key, correct);
        results.push({ correct, ms: performance.now() - started, label: q.label });
        note.textContent = correct ? ['Correct', explain].filter(Boolean).join(' · ') : explain || 'Not quite';
        note.classList.add(correct ? 'is-ok' : 'is-bad');
        if (correct) timer = setTimeout(advance, explain ? 1400 : 700);
        else next.hidden = false;
      },
    };

    host.replaceChildren(
      h(
        'div',
        { class: 'drill' },
        h(
          'div',
          { class: 'drill-top' },
          h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'End session', onclick: exit }, icon('close')),
          h('p', { class: 'drill-title' }, drills.length > 1 ? `${title} · ${drill.title}` : drill.title),
          h('p', { class: 'drill-count' }, `${index + 1} / ${length}`),
          drills.length === 1 && drill.options && h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Drill options', onclick: () => options(drill) }, icon('settings')),
        ),
        h('div', { class: 'progress' }, h('i', { style: { width: `${(index / length) * 100}%` } })),
        h('div', { class: 'prompt' }, main, sub),
        stage,
        answers,
        h('div', { class: 'drill-foot' }, note, next),
      ),
    );
    drill.render(q, ui);
  }

  function advance() {
    index++;
    if (index >= length) summary();
    else ask();
  }

  function options(drill) {
    clearTimeout(timer);
    openOptions(drill, () => ask(drill));
  }

  function summary() {
    const right = results.filter((r) => r.correct).length;
    const seconds = results.reduce((sum, r) => sum + r.ms, 0) / results.length / 1000;
    const missed = [...new Set(results.filter((r) => !r.correct).map((r) => r.label))];
    host.replaceChildren(
      h(
        'div',
        { class: 'drill summary' },
        h('p', { class: 'eyebrow' }, title),
        h('h2', { class: 'score' }, `${right}`, h('span', {}, ` / ${results.length}`)),
        h('p', { class: 'muted' }, `${seconds.toFixed(1)} seconds per answer`),
        missed.length
          ? h('div', { class: 'section' }, h('h3', { class: 'eyebrow' }, 'Review these'), h('ul', { class: 'missed' }, missed.map((m) => h('li', {}, m))))
          : h('p', {}, 'A clean round. Narrow the options or raise the difficulty to keep it hard.'),
        drills.length === 1 && h('p', { class: 'tip' }, drills[0].tip),
        h(
          'div',
          { class: 'summary-actions' },
          h('button', { type: 'button', class: 'btn', onclick: exit }, 'Done'),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-primary',
              onclick: () => {
                index = 0;
                results = [];
                ask();
              },
            },
            'Go again',
          ),
        ),
      ),
    );
  }

  ask();
}
