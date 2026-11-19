import { h } from '../ui/dom.js';
import { icon } from '../ui/icons.js';
import { Fretboard } from '../ui/fretboard.js';
import { DRILLS } from '../drills/index.js';
import { optionsFor, deckOf } from '../drills/session.js';
import { env, settings } from '../state/settings.js';
import { mastery, statOf, answeredToday } from '../state/progress.js';
import { pcAt, pcName } from '../theory/index.js';
import { header, section } from './common.js';

export function TrainView(root, app) {
  const e = env();
  const groups = [...new Set(DRILLS.map((d) => d.group))];
  const today = answeredToday();

  root.append(
    header('Woodshed', app),
    h(
      'div',
      { class: 'mix' },
      h('p', { class: 'eyebrow' }, 'Today’s mix'),
      h('h2', {}, '20 questions across every drill'),
      h('p', {}, 'Mixed on purpose. Switching topics feels harder than repeating one, and it sticks better. Questions lean toward what you miss.'),
      h(
        'div',
        { class: 'mix-foot' },
        h('button', { type: 'button', class: 'btn btn-light', onclick: app.startMix }, 'Start'),
        h('p', { class: 'mix-count' }, today ? `${today} answered today` : 'Nothing answered yet today'),
      ),
    ),
    ...groups.map((group) =>
      section(
        group,
        h(
          'div',
          { class: 'list' },
          DRILLS.filter((d) => d.group === group).map((drill) => {
            const pct = Math.round(mastery(deckOf(drill, e), drill.pool(optionsFor(drill, e), e)) * 100);
            return h(
              'button',
              { type: 'button', class: 'row', onclick: () => app.startDrill(drill) },
              h('span', { class: 'row-text' }, h('b', {}, drill.title), h('span', {}, drill.blurb)),
              h('span', { class: 'row-pct' }, pct ? `${pct}%` : ''),
              icon('chevron', 18),
              h('span', { class: 'meter', role: 'img', 'aria-label': `${pct}% mastered` }, h('i', { style: { width: `${pct}%` } })),
            );
          }),
        ),
      ),
    ),
    section('Your neck', neckMap(e)),
  );
}

// Every spot you have been asked about, coloured by how often you get it right.
function neckMap(e) {
  const tuning = e.tuning.midi;
  const dots = [];
  tuning.forEach((_, string) => {
    for (let fret = 0; fret <= 12; fret++) {
      const items = ['find-note', 'name-note'].map((id) => statOf(`${id}@${e.tuning.id}`, `${string}:${fret}`)).filter(Boolean);
      const n = items.reduce((sum, i) => sum + i.n, 0);
      if (!n) continue;
      const rate = items.reduce((sum, i) => sum + i.c, 0) / n;
      const label = pcName(pcAt(tuning, string, fret), settings.accidentals === 'flat' ? 'flat' : 'sharp');
      dots.push({ string, fret, label, role: rate >= 0.85 ? 'ok' : rate >= 0.5 ? 'seventh' : 'miss' });
    }
  });
  return [
    Fretboard({ tuning, from: 0, to: 12, dots, lefty: e.lefty, label: 'Your accuracy across the neck' }),
    h(
      'p',
      { class: 'muted small' },
      dots.length
        ? 'Green is solid, gold is shaky, red needs work. The note drills ask about the red spots more often.'
        : 'This fills in as you play the note drills: green where you are solid, red where you miss.',
    ),
  ];
}
