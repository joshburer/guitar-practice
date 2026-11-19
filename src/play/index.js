import noteHunt from './note-hunt.js';
import changes from './changes.js';
import songs from './songs.js';
import echo from './echo.js';

// Guitar-in-hand modes, listed on the Play tab. To add one, write the file and add it here.
export const PLAY_MODES = [noteHunt, changes, songs, echo];

// The daily session: the modes back to back, hands-free. Each block uses that mode's own saved options.
export const SESSION = [
  { mode: noteHunt, minutes: 3 },
  { mode: changes, minutes: 4 },
  { mode: echo, minutes: 3 },
  { mode: songs, minutes: 5 },
];
