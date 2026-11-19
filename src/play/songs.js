import { h } from '../ui/dom.js';
import { SONGS, songById, songChords, songKey, songTonic } from '../theory/index.js';
import { chordStep, SHOW, POSITION, BACKING } from './chord-step.js';

// The part of the tune being played, four bars to a row, with the current bar marked.
function chart(list, now, read) {
  // Eight bars at a time, so long sections stay glanceable.
  const first = Math.floor(now.bar / 8) * 8;
  const section = list.filter((c) => c.part === now.part && c.bar >= first && c.bar < first + 8);
  const bars = [...new Set(section.map((c) => c.bar))];
  return h(
    'div',
    { class: 'chart', 'aria-label': `Section ${now.section[0]}` },
    bars.map((bar) =>
      h(
        'span',
        { class: `chart-bar${bar === now.bar ? ' is-on' : ''}` },
        section.filter((c) => c.bar === bar).map((c) => h('b', {}, read === 'numbers' ? c.roman : c.chord.name)),
      ),
    ),
  );
}

export default {
  id: 'play-songs',
  listens: true,
  title: 'Songs',
  blurb: `Play through a whole tune: ${SONGS.length} to pick from.`,
  tip: 'Learn a tune in layers: roots, chord shapes, triads, 3rds and 7ths, then every chord tone.',
  options: [
    {
      id: 'song',
      label: 'Tune',
      default: SONGS[0].id,
      choices: () => SONGS.map((s) => ({ value: s.id, label: s.title, group: s.group })),
      note: (id) => `${songById(id).credit}. ${songById(id).tip}`,
    },
    SHOW,
    POSITION,
    {
      id: 'read',
      label: 'Read the chart as',
      default: 'names',
      choices: [
        { value: 'names', label: 'Chord names' },
        { value: 'numbers', label: 'Numbers' },
      ],
    },
    {
      id: 'keys',
      label: 'Each chorus',
      default: 'home',
      choices: [
        { value: 'home', label: 'Usual key' },
        { value: 'fourths', label: 'Up a 4th' },
        { value: 'random', label: 'Random key' },
      ],
    },
    BACKING,
  ],

  next(opts, e, memo) {
    const song = songById(opts.song);
    if (!memo.list || memo.at >= memo.list.length) {
      // A new chorus: maybe a new key, and (with "Move up each time round") a new position.
      memo.pass = memo.list ? memo.pass + 1 : 0;
      memo.tonic ??= songTonic(song);
      if (memo.list && opts.keys === 'fourths') memo.tonic = (memo.tonic + 5) % 12;
      if (memo.list && opts.keys === 'random') memo.tonic = (memo.tonic + 1 + Math.floor(Math.random() * 11)) % 12;
      memo.list = songChords(song, memo.tonic);
      memo.at = 0;
    }
    const first = memo.at === 0;
    const list = memo.list;
    const now = list[memo.at++];
    const key = songKey(song, memo.tonic);
    const name = opts.read === 'numbers' ? now.roman : now.chord.name;
    const place = song.form.length > 1 ? `${now.section[0]} section` : `chorus ${memo.pass + 1}`;
    return chordStep({
      chord: now.chord,
      key,
      beats: now.beats,
      offset: now.offset,
      title: name,
      detail: `${opts.read === 'numbers' ? key.name : now.roman} · ${song.title}, ${place}`,
      peek: name,
      opener: first ? `${song.title} in ${key.name}` : undefined,
      opts,
      e,
      memo,
      below: () => chart(list, now, opts.read),
    });
  },
};
