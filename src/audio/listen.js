import { noteTracker, FRAME, HOP_MS } from './pitch.js';
import { chromaOf } from './chroma.js';
import { audioContext } from './synth.js';

// Listen to the guitar through the microphone and report single notes as they settle, and what chord is ringing.
//   const stop = await listen((midi) => ..., (reading) => ...)
//   midi is a MIDI note number, or null when the string stops ringing
//   reading is { chroma, bass, level } from chroma.js, eight times a second, or null in silence
// Rejects when there is no microphone, permission is refused, or the host blocks it (a Claude artifact does).
export async function listen(onNote, onChord) {
  const context = audioContext();
  if (!context || !navigator.mediaDevices?.getUserMedia) throw new Error('No microphone available');

  // Phone voice processing mangles a guitar: ask for the raw signal.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const source = context.createMediaStreamSource(stream);
  // Mains hum and handling rumble sit below the lowest string and drown quiet high notes: cut them first.
  const rumble = context.createBiquadFilter();
  rumble.type = 'highpass';
  rumble.frequency.value = 62;
  rumble.Q.value = 0.7;
  source.connect(rumble);
  const analyser = context.createAnalyser();
  analyser.fftSize = FRAME;
  rumble.connect(analyser);
  // Chords need a longer window than single notes: low strings a semitone apart are only ~5 Hz apart.
  const wide = context.createAnalyser();
  wide.fftSize = 16384;
  source.connect(wide);
  const block = new Float32Array(wide.fftSize);
  let tick = 0;

  const samples = new Float32Array(analyser.fftSize);
  const track = noteTracker(context.sampleRate);
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    const note = track(samples);
    if (note !== undefined) onNote(note);
    if (onChord && ++tick % 5 === 0) {
      wide.getFloatTimeDomainData(block);
      onChord(chromaOf(block, context.sampleRate));
    }
  }, HOP_MS);

  return () => {
    clearInterval(timer);
    source.disconnect();
    rumble.disconnect();
    stream.getTracks().forEach((track) => track.stop());
  };
}
