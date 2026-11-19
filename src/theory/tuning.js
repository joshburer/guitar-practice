import { pcName, mod } from './notes.js';

// Strings are indexed low to high: 0 is the thickest string. Values are MIDI notes of the open strings.
export const TUNINGS = [
  { id: 'standard', name: 'Standard (EADGBE)', midi: [40, 45, 50, 55, 59, 64] },
  { id: 'half-down', name: 'Half step down (E♭)', midi: [39, 44, 49, 54, 58, 63] },
  { id: 'drop-d', name: 'Drop D', midi: [38, 45, 50, 55, 59, 64] },
  { id: 'dadgad', name: 'DADGAD', midi: [38, 45, 50, 55, 57, 62] },
  { id: 'open-g', name: 'Open G (DGDGBD)', midi: [38, 43, 50, 55, 59, 62] },
];

export const tuningById = (id) => TUNINGS.find((t) => t.id === id) ?? TUNINGS[0];

export const midiAt = (midi, string, fret) => midi[string] + fret;
export const pcAt = (midi, string, fret) => mod(midi[string] + fret, 12);

export const stringName = (midi, string) => pcName(midi[string], 'flat');

// Players count strings from the thin side: the low E is the 6th string.
export function stringOrdinal(midi, string) {
  const n = midi.length - string;
  return `${n}${['th', 'st', 'nd', 'rd'][n] ?? 'th'}`;
}
