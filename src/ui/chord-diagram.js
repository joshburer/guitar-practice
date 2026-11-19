import { s } from './dom.js';
import { barreOf } from '../theory/index.js';

const GAUGE = [2, 1.7, 1.4, 1.1, 0.9, 0.8];

// A chord box: strings run top to bottom, low string on the left.
//   frets  one entry per string low to high, -1 = muted
//   info   (string, fret) => ({ label, role })   what each dot says and its colour
export function ChordDiagram({ frets, info = () => ({}), lefty = false, scale = 1, onClick, label = 'Chord diagram' }) {
  const n = frets.length;
  const fretted = frets.filter((f) => f > 0);
  const max = fretted.length ? Math.max(...fretted) : 1;
  const base = max <= 4 ? 1 : Math.min(...fretted);
  const rows = Math.max(4, max - base + 1);
  const sw = 20;
  const fh = 24;
  const left = 30;
  const top = 22;
  const W = left + (n - 1) * sw + 18;
  const H = top + rows * fh + 6;
  const xOf = (string) => left + (lefty ? n - 1 - string : string) * sw;
  const yOf = (fret) => top + (fret - base) * fh + fh / 2;

  const svg = s('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: W * scale,
    height: H * scale,
    class: `cd${onClick ? ' cd-tap' : ''}`,
    role: 'img',
    'aria-label': label,
  });
  svg.append(s('rect', { class: 'fb-board', x: left - 9, y: top, width: (n - 1) * sw + 18, height: rows * fh, rx: 5 }));
  if (base === 1) svg.append(s('rect', { class: 'fb-nut', x: left - 9, y: top - 2, width: (n - 1) * sw + 18, height: 4, rx: 2 }));
  else svg.append(s('text', { class: 'fb-label cd-base', x: left - 13, y: yOf(base) }, `${base}fr`));
  for (let r = 1; r < rows; r++) {
    svg.append(s('line', { class: 'fb-fret', x1: left - 9, x2: left + (n - 1) * sw + 9, y1: top + r * fh, y2: top + r * fh }));
  }
  frets.forEach((fret, string) => {
    const x = xOf(string);
    svg.append(s('line', { class: 'fb-string', x1: x, x2: x, y1: top, y2: top + rows * fh, 'stroke-width': GAUGE[string] ?? 1 }));
    if (fret < 0) svg.append(s('path', { class: 'cd-mute', d: `M${x - 3.5} ${top - 13}l7 7m0-7l-7 7` }));
    if (fret === 0) svg.append(s('circle', { class: `cd-open role-${info(string, 0).role ?? 'tone'}`, cx: x, cy: top - 9.5, r: 4 }));
  });

  const barre = barreOf(frets);
  if (barre) {
    const xs = [xOf(barre.from), xOf(barre.to)].sort((a, b) => a - b);
    svg.append(s('rect', { class: 'cd-barre', x: xs[0] - 8.5, y: yOf(barre.fret) - 8.5, width: xs[1] - xs[0] + 17, height: 17, rx: 8.5 }));
  }
  frets.forEach((fret, string) => {
    if (fret <= 0) return;
    const { label: text = '', role = 'tone' } = info(string, fret);
    svg.append(
      s(
        'g',
        { class: `dot role-${role}` },
        s('circle', { cx: xOf(string), cy: yOf(fret), r: 8.5 }),
        text && s('text', { x: xOf(string), y: yOf(fret), 'font-size': text.length > 2 ? 7 : text.length === 2 ? 8.5 : 10 }, text),
      ),
    );
  });
  if (onClick) svg.addEventListener('click', onClick);
  return svg;
}
