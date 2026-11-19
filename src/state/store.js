// localStorage with a memory fallback, so the app works in private windows and previews too.
const PREFIX = 'woodshed:';
const memory = {};

export function load(key, fallback) {
  if (key in memory) return memory[key];
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw != null) return (memory[key] = JSON.parse(raw));
  } catch {
    /* storage unavailable: fall through */
  }
  return (memory[key] = fallback);
}

export function save(key, value) {
  memory[key] = value;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* keep the in-memory copy */
  }
}
