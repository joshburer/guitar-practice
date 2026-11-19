import { h, s } from './dom.js';
import { stringName } from '../theory/index.js';

const INLAYS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21]);
const GAUGE = [2.5, 2.1, 1.7, 1.3, 1.1, 0.9];

// The neck, low string at the bottom, drawn to fit its container.
//   tuning   open-string MIDI notes, low to high
//   from/to  fret window (from 0 includes the open strings)
//   dots     [{ string, fret, label, role }]  role sets the colour: root | third | fifth | seventh | tone | q | ok | bad ...
//   onTap    ({ string, fret }) => void       makes the neck an input
//   strings  limit taps to these strings and dim the rest
export function Fretboard({ tuning, from = 0, to = 12, dots = [], onTap, strings, lefty = false, label = 'Guitar neck' }) {
  const n = tuning.length;
  const open = from === 0;
  const first = open ? 1 : from;
  const cols = to - first + 1;
  const gap = onTap ? 36 : 30;
  const padL = 18;
  const padR = 6;
  const padT = gap / 2 + 2;
  const openW = open ? 30 : 0;
  const fw = Math.max(24, Math.min(64, (366 - padL - padR - openW) / cols));
  const W = padL + openW + cols * fw + padR;
  const H = padT + (n - 1) * gap + gap / 2 + 20;
  const nut = padL + openW;
  const top = padT - gap / 2 + 2;
  const bottom = padT + (n - 1) * gap + gap / 2 - 2;

  const X = (x) => (lefty ? W - x : x);
  const xOf = (fret) => X(fret === 0 && open ? padL + openW / 2 : nut + (fret - first) * fw + fw / 2);
  const yOf = (string) => padT + (n - 1 - string) * gap;
  const active = (string) => !strings || strings.includes(string);

  const svg = s('svg', { viewBox: `0 0 ${W} ${H}`, class: `fb${onTap ? ' fb-input' : ''}`, role: 'img', 'aria-label': label });
  if (fw === 24) svg.style.minWidth = `${W}px`; // long necks scroll inside their own box

  const boardX = lefty ? W - (padL + openW + cols * fw) : padL;
  svg.append(s('rect', { class: 'fb-board', x: boardX, y: top, width: openW + cols * fw, height: bottom - top, rx: 6 }));

  for (let f = first; f <= to; f++) {
    if (!INLAYS.has(f)) continue;
    const ys = f % 12 === 0 ? [yOf(n - 2) + gap / 2, yOf(1) - gap / 2] : [(top + bottom) / 2];
    for (const y of ys) svg.append(s('circle', { class: 'fb-inlay', cx: xOf(f), cy: y, r: 4.5 }));
  }
  for (let i = 0; i <= cols; i++) {
    const x = X(nut + i * fw);
    if (i === 0 && open) svg.append(s('rect', { class: 'fb-nut', x: x - 2, y: top, width: 4, height: bottom - top }));
    else if (i > 0 && i < cols) svg.append(s('line', { class: 'fb-fret', x1: x, x2: x, y1: top, y2: bottom }));
  }
  for (let st = 0; st < n; st++) {
    const y = yOf(st);
    const dim = active(st) ? '' : ' fb-dim';
    svg.append(
      s('line', { class: `fb-string${dim}`, x1: X(padL), x2: X(padL + openW + cols * fw), y1: y, y2: y, 'stroke-width': GAUGE[st] ?? 1 }),
      s('text', { class: `fb-label${dim}`, x: X(padL / 2 - 1), y }, stringName(tuning, st)),
    );
  }
  for (let f = first; f <= to; f++) {
    if (INLAYS.has(f) || f === first || cols <= 8) svg.append(s('text', { class: 'fb-label', x: xOf(f), y: H - 8 }, f));
  }

  const r = Math.min(gap, fw) / 2 - 2.5;
  for (const dot of dots) {
    if (dot.fret !== 0 && (dot.fret < first || dot.fret > to)) continue;
    if (dot.fret === 0 && !open) continue;
    const text = dot.label == null ? '' : String(dot.label);
    const size = r * (text.length > 2 ? 0.78 : text.length === 2 ? 0.98 : 1.15);
    svg.append(
      s(
        'g',
        { class: `dot role-${dot.role ?? 'tone'}` },
        s('circle', { cx: xOf(dot.fret), cy: yOf(dot.string), r: dot.role === 'ghost' && !text ? r * 0.45 : r }),
        text && s('text', { x: xOf(dot.fret), y: yOf(dot.string), 'font-size': size.toFixed(1) }, text),
      ),
    );
  }

  if (onTap) {
    svg.addEventListener('click', (event) => {
      const box = svg.getBoundingClientRect();
      const x = X(((event.clientX - box.left) * W) / box.width);
      const y = ((event.clientY - box.top) * H) / box.height;
      const fret = x < nut ? (open ? 0 : first) : Math.min(to, first + Math.floor((x - nut) / fw));
      const allowed = strings ?? tuning.map((_, i) => i);
      const string = allowed.reduce((best, st) => (Math.abs(yOf(st) - y) < Math.abs(yOf(best) - y) ? st : best));
      onTap({ string, fret });
    });
  }

  const wrap = h('div', { class: 'fb-wrap' }, svg);
  // A left-handed neck that scrolls starts at the nut, which is on the right.
  if (lefty && svg.style.minWidth) requestAnimationFrame(() => (wrap.scrollLeft = wrap.scrollWidth));
  return wrap;
}
