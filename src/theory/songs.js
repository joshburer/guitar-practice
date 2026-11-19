import { parseNote, pc, mod } from './notes.js';
import { chordById, spellChord } from './chords.js';
import { roman, makeKey, TONICS } from './keys.js';

// Songs are chord charts only: the changes players use, written the way a lead sheet reads. No melodies, no lyrics.
// Every tune here is a common form, a traditional song, or a composition in the US public domain
// (published in 1930 or earlier). Charts were checked against several independent lead-sheet collections;
// where sources differ, the plainest widely played version is used.
//
// To add a song: name its sections, give the order they are played in (`form`), and write each section as bars
// separated by "|". One chord fills the bar, two share it. A chord symbol is a root (A–G, optional b or #) plus a
// chord id from chords.js ("" = major, "m" = minor). End the last bar with a turnaround so the tune loops.
const song = (group, id, title, credit, key, form, sections, tip) => ({
  group,
  id,
  title,
  credit,
  key,
  mode: key.endsWith('m') ? 'minor' : 'major',
  form: form.split(' '),
  sections,
  tip,
});

const FORMS = 'Forms';
const TRAD = 'Traditional';
const STANDARDS = 'Standards';

export const SONGS = [
  song(FORMS, 'blues', '12-bar blues', 'Traditional form', 'A', 'A', {
    A: 'A7 | D7 | A7 | A7 | D7 | D7 | A7 | A7 | E7 | D7 | A7 | E7',
  }, 'Three dominant chords, twelve bars. Know where you are without counting: the move to the IV in bar 5 and the V in bar 9 are the landmarks.'),
  song(FORMS, 'minor-blues', 'Minor blues', 'Traditional form', 'Am', 'A', {
    A: 'Am7 | Dm7 | Am7 | Am7 | Dm7 | Dm7 | Am7 | Am7 | F7 | E7 | Am7 | Bm7b5 E7',
  }, 'The ♭VI7 falling to V7 in bars 9 and 10 is the sound of the minor blues. Aim for the 3rd of each.'),
  song(FORMS, 'jazz-blues', 'Jazz blues', 'Traditional form', 'Bb', 'A', {
    A: 'Bb7 | Eb7 | Bb7 | Fm7 Bb7 | Eb7 | Edim7 | Bb7 | Dm7 G7 | Cm7 | F7 | Bb7 G7 | Cm7 F7',
  }, 'The blues with ii–Vs added. Bar 4 sets up the IV; bars 8 to 10 walk iii–VI–ii–V back home.'),
  song(FORMS, 'rhythm-changes', 'Rhythm changes', 'From “I Got Rhythm”, Gershwin, 1930', 'Bb', 'A1 A2 B A1', {
    A1: 'Bb6 Gm7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Bb6 Bb7 | Eb6 Edim7 | Bb6 F7 | Bb6 F7',
    A2: 'Bb6 Gm7 | Cm7 F7 | Dm7 G7 | Cm7 F7 | Bb6 Bb7 | Eb6 Edim7 | Bb6 F7 | Bb6',
    B: 'D7 | D7 | G7 | G7 | C7 | C7 | F7 | F7',
  }, 'After the blues, the form to know. The A sections are I–vi–ii–V turnarounds at speed; the bridge is a cycle of dominants, two bars each.'),

  song(TRAD, 'saints', 'When the Saints Go Marching In', 'Traditional', 'F', 'A', {
    A: 'F | F | F | F | F | F | C7 | C7 | F | F7 | Bb | Bbm | F | C7 | F | F C7',
  }, 'Almost all I and V. Listen for the I7 in bar 10 pulling to the IV, then the IV turning minor.'),
  song(TRAD, 'careless-love', 'Careless Love', 'Traditional', 'F', 'A', {
    A: 'F | C7 | F | F | F | D7 | G7 | C7 | F | F7 | Bb | Bbm | F | C7 | F | F C7',
  }, 'Sixteen bars with a short cycle of dominants in bars 6 to 8: VI7, II7, V7.'),
  song(TRAD, 'st-james', 'St. James Infirmary', 'Traditional', 'Dm', 'A', {
    A: 'Dm A7 | Dm | Dm Gm | A7 | Dm A7 | Dm | Bb7 A7 | Dm A7',
  }, 'Eight bars in a minor key. The ♭VI7 to V7 in bar 7 is the same move as the minor blues.'),
  song(TRAD, 'bill-bailey', 'Bill Bailey', 'Hughie Cannon, 1902', 'G', 'A B A2 C', {
    A: 'G | G | G | G | G | G | D7 | D7',
    B: 'D7 | D7 | D7 | D7 | D7 | D7 | G | G',
    A2: 'G | G | G | G | G7 | G7 | C | C',
    C: 'C | C#dim7 | G | E7 | A7 | D7 | G | G D7',
  }, 'Long stretches of I and V, then a quick cycle home at the end: IV, ♯iv°, I, VI7, II7, V7.'),

  song(STANDARDS, 'sweet-georgia-brown', 'Sweet Georgia Brown', 'Bernie, Pinkard and Casey, 1925', 'Ab', 'A B A C', {
    A: 'F7 | F7 | F7 | F7 | Bb7 | Bb7 | Bb7 | Bb7',
    B: 'Eb7 | Eb7 | Eb7 | Eb7 | Abmaj7 | Eb7 | Abmaj7 | Gm7 C7',
    C: 'Fm | C7 | Fm | C7 | Ab7 G7 | Gb7 F7 | Bb7 Eb7 | Ab6 C7',
  }, 'Dominant chords round the cycle of fourths, four bars each: plenty of time to find each one in a new position.'),
  song(STANDARDS, 'avalon', 'Avalon', 'Jolson, DeSylva and Rose, 1920', 'F', 'A B', {
    A: 'Gm7 | Gm7 | C7 | C7 | F6 | F6 | F6 | D7 | Gm7 | Gm7 | C7 | C7 | F6 | F6 | F6 | F6',
    B: 'Am7 | Am7 | D7 | D7 | Gm7 | Gm7 | Bbm7 | Eb7 | F6 | F6 | D7 | D7 | Gm7 | C7 | F6 | F6',
  }, 'Long ii–V–I phrases, two bars per chord. A calm place to practise 3rds and 7ths.'),
  song(STANDARDS, 'aint-she-sweet', 'Ain’t She Sweet', 'Ager and Yellen, 1927', 'Eb', 'A1 A2 B A1', {
    A1: 'Eb6 B7 | Bb7 | Eb6 B7 | Bb7 | Eb6 G7 | C7 | F7 Bb7 | Eb6 Bb7',
    A2: 'Eb6 B7 | Bb7 | Eb6 B7 | Bb7 | Eb6 G7 | C7 | F7 Bb7 | Eb6 Eb7',
    B: 'Ab | Ab | Eb6 | Eb7 | Ab | Ab | Eb6 | F7 Bb7',
  }, 'A ♭VI7 dropping to V7 in the first bars, then a cycle of dominants: III7, VI7, II7, V7.'),
  song(STANDARDS, 'lady-be-good', 'Oh, Lady Be Good!', 'Gershwin, 1924', 'G', 'A1 A2 B A1', {
    A1: 'G6 | C7 | G6 | E7 | Am7 | D7 | G6 | Am7 D7',
    A2: 'G6 | C7 | G6 | E7 | Am7 | D7 | G6 | Dm7 G7',
    B: 'Cmaj7 | C#dim7 | G6 | F#m7b5 B7 | Em7 | A7 | Am7 | D7',
  }, 'A swing-era jam favourite. The bridge climbs IV, ♯iv°, I, then a ii–V into the vi chord.'),
  song(STANDARDS, 'honeysuckle-rose', 'Honeysuckle Rose', 'Waller and Razaf, 1929', 'F', 'A1 A2 B A1', {
    A1: 'Gm7 C7 | Gm7 C7 | Gm7 C7 | Gm7 C7 | F6 F7 | Bb6 C7 | F6 | Am7 D7',
    A2: 'Gm7 C7 | Gm7 C7 | Gm7 C7 | Gm7 C7 | F6 F7 | Bb6 C7 | F6 | F6',
    B: 'F7 | F7 | Bb6 | Bb6 | G7 | G7 | C7 | C7',
  }, 'Four bars of ii–V before the I arrives. The bridge is I7 to IV, then II7 to V7.'),
  song(STANDARDS, 'sunny-side', 'On the Sunny Side of the Street', 'McHugh and Fields, 1930', 'C', 'A1 A2 B A1', {
    A1: 'C6 | E7 | F6 | G7 | Am7 | D7 | Dm7 G7 | C6 G7',
    A2: 'C6 | E7 | F6 | G7 | Am7 | D7 | Dm7 G7 | C6',
    B: 'Gm7 | C7 | Fmaj7 | Fmaj7 | Am7 | D7 | Dm7 | G7',
  }, 'The III7 in bar 2 is the surprise: its 3rd is the note to aim for. The bridge opens with a ii–V into the IV.'),
  song(STANDARDS, 'what-is-this-thing', 'What Is This Thing Called Love?', 'Cole Porter, 1929', 'C', 'A A B A', {
    A: 'Gm7b5 | C7 | Fm6 | Fm6 | Dm7b5 | G7 | Cmaj7 | Cmaj7',
    B: 'Cm7 | F7 | Bbmaj7 | Bbmaj7 | Ab7 | Ab7 | Dm7b5 | G7',
  }, 'A minor ii–V–i, then a major one. The bridge drops a whole step, and a ♭VI7 leads back.'),
  song(STANDARDS, 'bye-bye-blackbird', 'Bye Bye Blackbird', 'Henderson and Dixon, 1926', 'F', 'A B C A2', {
    A: 'Fmaj7 | Gm7 C7 | Fmaj7 | Fmaj7 | Fmaj7 | Abdim7 | Gm7 | C7',
    B: 'Gm7 | D7 | Gm7 | C7 | Gm7 | C7 | F6 | F6',
    C: 'F7 | E7 | Eb7 | D7 | Gm7 | Gm7 | Db7 | C7',
    A2: 'Fmaj7 | Gm7 C7 | Fmaj7 | Am7b5 D7 | Gm7 | C7 | F6 | Gm7 C7',
  }, 'A jam-session staple with many variants. Bars 17 to 20 slide down in dominants: I7, VII7, ♭VII7, VI7.'),
  song(STANDARDS, 'indiana', 'Back Home Again in Indiana', 'Hanley and MacDonald, 1917', 'F', 'A B', {
    A: 'Fmaj7 Eb7 | D7 | G7 | G7 | Gm7 | C7 | Fmaj7 | Cm7 F7 | Bbmaj7 | Bbm7 Eb7 | Fmaj7 | D7 | G7 | G7 | Gm7 | C7',
    B: 'Fmaj7 Eb7 | D7 | G7 | G7 | Em7b5 | A7 | Dm | Em7b5 A7 | Dm | Em7b5 A7 | Dm | Bdim7 | Am7 D7 | Gm7 C7 | F6 | Gm7 C7',
  }, 'Fast-moving changes with ii–Vs in three keys: the harmony under many bebop heads.'),
  song(STANDARDS, 'after-youve-gone', 'After You’ve Gone', 'Layton and Creamer, 1918', 'Bb', 'A B', {
    A: 'Ebmaj7 | Ebmaj7 | Ebm6 | Ab7 | Bbmaj7 | Bbmaj7 | Dm7 | G7 | C7 | C7 | F7 | F7 | Bb6 | Bb6 | Fm7 | Bb7',
    B: 'Ebmaj7 | Ebmaj7 | Ebm6 | Ab7 | Bbmaj7 | Bbmaj7 | Dm7 | G7 | Cm7 | G7 | Cm7 | Ebm6 Ab7 | Bbmaj7 | Am7 D7 | Gm7 | Edim7 | Bb6 | G7 | Cm7 | F7 | Bb6 | Bb6 | Fm7 | Bb7',
  }, 'It starts on the IV chord, not the I. Forty bars: learn it in two halves.'),
];

export const songById = (id) => SONGS.find((s) => s.id === id) ?? SONGS[0];

export function parseSymbol(symbol) {
  const match = /^([A-G][b#]?)(.*)$/.exec(symbol);
  const type = match && chordById(match[2] === '' ? 'maj' : match[2] === 'm' ? 'min' : match[2]);
  if (!type) throw new Error(`Unknown chord symbol: ${symbol}`);
  return { rootPc: pc(parseNote(match[1])), type };
}

export const songTonic = (s) => pc(parseNote(s.key.replace(/m$/, '')));

// The key a song lands in when its tonic is moved to a pitch class.
export const songKey = (s, tonicPc = songTonic(s)) => makeKey(TONICS[s.mode].find((name) => pc(parseNote(name)) === mod(tonicPc, 12)), s.mode);

// Roman numerals are measured from the major scale, the jazz convention: ♭III, ♭VI and ♭VII in minor keys.
const DEGREE = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [3, 1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];

// The whole form as chords in playing order, moved to any key:
// [{ chord, roman, beats, offset (beat in the bar it starts on), part (index in the form), section, bar }]
export function songChords(s, tonicPc = songTonic(s)) {
  const shift = tonicPc - songTonic(s);
  const out = [];
  s.form.forEach((section, part) => {
    s.sections[section].split('|').forEach((cell, bar) => {
      const symbols = cell.trim().split(/\s+/);
      symbols.forEach((symbol, i) => {
        const { rootPc, type } = parseSymbol(symbol);
        const [degree, alter] = DEGREE[mod(rootPc - songTonic(s), 12)];
        out.push({
          chord: spellChord(mod(rootPc + shift, 12), type),
          roman: roman(degree, type, alter),
          beats: 4 / symbols.length,
          offset: (4 / symbols.length) * i,
          part,
          section,
          bar,
        });
      });
    });
  });
  return out;
}
