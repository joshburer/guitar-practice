# Woodshed: overview

A mobile-first guitar practice app for intermediate players and up. No build step, no dependencies: plain ES modules.

```bash
npm start       # preview at http://localhost:4173 (the microphone works on localhost)
npm test        # theory, song, pitch- and chord-detection tests
npm run build   # writes dist/, a static site for any HTTPS host
```

Pushing to `main` on GitHub runs the tests, builds `dist/` and publishes it to GitHub Pages
(`.github/workflows/pages.yml`). One-time setup: repo Settings → Pages → Source: GitHub Actions.

`index.html` is a page fragment, the form a Claude artifact is published in. `npm start` and `npm run build` wrap it
into a full document (`shell.mjs`). The microphone only works on the self-hosted build: browsers offer it to HTTPS
sites, and Claude artifacts are not allowed to ask for it. Everything else behaves the same in both.

## What is in it

| Tab | What it does |
| --- | --- |
| **Play** | Guitar in hand, phone propped up. A click keeps time and prompts move on by themselves. *Note hunt*, *Changes*, *Songs*, *Echo*, or all four back to back as a 15-minute daily session. With the microphone on, single notes and strummed chords are heard and checked: a chord counts as on time when it rings clean within two beats of the change. |
| **Train** | Seven drills plus *Today's mix*, an interleaved round across all of them. Drills adapt: items you miss come back more often. A heat map shows which spots on the neck you know. |
| **Neck** | Any scale or arpeggio from any root across the whole neck, labelled by degree or note name. |
| **Chords** | *Voicings*: every playable grip for a chord, generated for the current tuning. *Triads*: the three inversions on any string set. *Identify*: tap notes on the neck, get the chord name. |
| **Keys** | One key at a time: its seven chords by Roman numeral, each chord's tones lit up inside the key's scale, and common progressions to play. Step through keys by fourths or at random. |

Drills: Find the note, Name the note, Interval shapes, Name the chord, Spell the chord, Chords by number, Intervals by ear.

## How it is organised

```
index.html         page shell and colour tokens
styles.css         all styling, built from the tokens
src/
  theory/          music theory, no DOM: notes, intervals, scales, chords, keys, tunings, voicings
  ui/              components: Fretboard, ChordDiagram, pickers, tone chips
  drills/          one file per drill + session.js, which runs any drill
  play/            one file per play-along mode + runner.js (clock, tempo, microphone, session blocks)
  views/           one file per tab
  state/           settings, saved progress and the spaced-repetition picker
  audio/           plucked-string synth, metronome click, microphone pitch and chord detection
  app.js           tabs, routing, settings sheet
tests/             node:test tests for the theory core and the detectors (guitar-sim.js fakes a strummed guitar)
```

Everything is derived from the theory core. A chord is a formula of intervals; its notes, its spelling, its
voicings in any tuning, and its Roman numeral in a key are all computed from that formula. Nothing is a lookup table
of shapes, so adding to the theory lights up every tab and drill at once.

## Adding things

**A scale or chord type.** Add one line to `SCALES` in `src/theory/scales.js` or `CHORDS` in `src/theory/chords.js`:

```js
scale('whole-tone', 'Whole tone', 'Symmetric', '1 2 3 #4 #5 b7'),
chord('maj7#11', 'maj7♯11', 'Major 7 sharp 11', 'Extended', '1 3 5 7 #11'),
```

It appears in the Neck and Chords pickers, gets voicings, and is recognised by Identify.

**A tuning.** Add a line to `TUNINGS` in `src/theory/tuning.js` (open-string MIDI notes, low to high).

**A progression.** Add to `PROGRESSIONS` in `src/theory/keys.js`. A step is a scale degree `0–6`, or
`step(degree, chordId, alter)` for borrowed chords.

**A drill.** Create `src/drills/my-drill.js` and add it to the list in `src/drills/index.js`. A drill is an object:

```js
export default {
  id: 'my-drill',            // also the key progress is saved under
  group: 'Fretboard',        // heading on the Train tab
  title: 'My drill',
  blurb: 'One line for the list.',
  tip: 'Coaching shown in the options sheet and after a round.',
  neck: true,                // optional: keep separate progress per tuning
  options: [{ id, label, default, choices: [{ value, label }] }],

  pool(opts, env) {},        // every item this drill can ask, as string keys
  build(key, opts, env) {},  // turn a key into a question; include `label` for the end-of-round review
  render(q, ui) {},          // draw it: ui.prompt(text, detail), ui.stage, ui.answers, then ui.done(correct, explain)
};
```

The session runner handles the rest: picking weak items, timing, feedback, scoring, the review screen, saving
progress, and including the drill in Today's mix.

**A song.** Add an entry to `SONGS` in `src/theory/songs.js`. Write each section as bars separated by `|`; one chord
fills a bar, two share it. Keep to public-domain tunes and common forms, and to chord symbols only.

```js
song('my-tune', 'My tune', 'Composer, year', 'F', 'AABA', {
  A: 'F | Dm7 | Gm7 | C7 | F | Dm7 | Gm7 C7 | F',
  B: 'Cm7 | F7 | Bb | Bb | Dm7 | G7 | Gm7 | C7',
}, 'One line of coaching for this tune.'),
```

The Songs mode can then play it in any key, as chord names or Roman numerals, in any position.

The library ships with 18 tunes: blues forms and rhythm changes, traditional songs, and standards published in 1930
or earlier, which are in the US public domain. It holds chord changes only, never melodies or lyrics. Tunes from 1931
enter the US public domain in January 2027, and so on each year; outside the US the terms differ.

**A play-along mode.** Create `src/play/my-mode.js` and add it to `PLAY_MODES` in `src/play/index.js`. A mode has the
same `id`, `title`, `blurb`, `tip` and `options` as a drill, plus one function that returns the next step:

```js
next(opts, env, memo) {      // memo persists between calls; memo.listening is true while the mic is on
  return {
    beats: 4,                // how long this step lasts
    title: 'F♯',             // the big prompt: a string, or (beat) => string
    detail: 'on the 5th string',
    peek: 'F♯, 5th string',  // shown as "Next: …" during the step before
    draw(stage, beat) {},    // called on every beat: reveal the answer on beat 2, say
    sound(beat, at) {},      // schedule audio for a beat: pluck(midi, 0, { at })
    hear(midi, beat) {},     // optional: a note the microphone heard
    hearChord(reading, beat) {}, // optional: what chord is ringing (audio/chroma.js); return { text, ok } to show
  };
}
```

For modes built on chords, `chordStep()` in `src/play/chord-step.js` builds the step and brings the whole ladder with
it (roots, shapes, triads, 3rds and 7ths, chord tones, in any position).

**A tab.** Write `src/views/my-view.js` exporting `(root, app) => { root.append(...) }` and add it to `TABS` in
`src/app.js` (plus an icon path in `src/ui/icons.js`).

**Coaching copy** lives in each drill's `tip` and in the short notes under each view.

## Components

```js
Fretboard({ tuning, from, to, dots: [{ string, fret, label, role }], onTap, strings, lefty })
ChordDiagram({ frets: [-1, 3, 2, 0, 1, 0], info: (string, fret) => ({ label, role }), lefty, scale })
```

`role` sets a dot's colour and means the same thing everywhere: `root`, `third`, `fifth`, `seventh`, `tone`
(other scale notes), plus `q`, `ok`, `bad`, `reveal`, `ghost` for drills and overlays. Strings are indexed low to
high, so string `0` is the low E.

## Why these drills

- **One string at a time, say it aloud**: the standard route to knowing the neck. Note drills can be limited to a string or fret range.
- **Intervals from a root**: note names get you to a place, intervals are how you move from it. Chord tones are colour-coded identically in every view.
- **Triads on string sets**: small shapes that connect CAGED positions and expose voice leading.
- **Numbers, not letters**: learn progressions as Roman numerals, then run them round the cycle of fourths and in random keys.
- **Play, then check by ear**: the play modes give you a couple of clicks to find the answer, then sound it. Your ear does the marking; the microphone, where available, adds a score.
- **Tunes in layers**: roots, chords, triads, guide tones (3rds and 7ths), all chord tones, then again in another position and another key. Every chord-based mode offers the same ladder.
- **Interleaving**: mixed practice feels harder than repeating one thing and holds up better later, so the default session mixes drills.
