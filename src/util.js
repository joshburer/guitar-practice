export const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

export const sample = (list) => list[Math.floor(Math.random() * list.length)];

export function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
