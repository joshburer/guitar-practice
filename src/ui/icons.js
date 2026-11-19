import { s } from './dom.js';

const PATHS = {
  train: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8z M12 11.6v.8',
  metronome: 'M9.5 3h5l4 18h-13z M12 15l4.5-9.5 M7.3 15h9.4',
  neck: 'M3 7h18v10H3z M8.5 7v10 M14 7v10 M3 10.3h18 M3 13.7h18',
  chords: 'M7 7h10v13H7z M12 7v13 M7 11.3h10 M7 15.7h10 M6 4h12',
  keys: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M12 3v3.5 M12 17.5V21 M3 12h3.5 M17.5 12H21 M5.6 5.6l2.5 2.5 M15.9 15.9l2.5 2.5 M18.4 5.6l-2.5 2.5 M8.1 15.9l-2.5 2.5',
  settings: 'M4 7h8 M20 7h-1 M4 17h1 M12 17h8 M15.5 4.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z M8.5 14.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5z',
  close: 'M6 6l12 12 M18 6L6 18',
  play: 'M8 5.5v13l11-6.5z',
  chevron: 'M9 5l7 7-7 7',
  shuffle: 'M3 7h3.5l9 10H20 M3 17h3.5l2.6-2.9 M13 9.6L15.5 7H20 M17.5 4.5L20 7l-2.5 2.5 M17.5 14.5L20 17l-2.5 2.5',
};

export const icon = (name, size = 22) =>
  s(
    'svg',
    { viewBox: '0 0 24 24', width: size, height: size, class: `icon icon-${name}`, 'aria-hidden': 'true' },
    s('path', { d: PATHS[name] }),
  );
