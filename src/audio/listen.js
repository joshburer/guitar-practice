import { detectPitch, midiOf } from './pitch.js';
import { chromaOf } from './chroma.js';
import { audioContext } from './synth.js';

// Listen to the guitar through the microphone and report single notes as they settle, and what chord is ringing.
//   const stop = await listen((midi) => ..., (reading) => ...)
//   midi is a MIDI note number, or null when the string stops ringing
//   reading is { chroma, bass, level } from chroma.js, about eight times a second, or null in silence
// Rejects when there is no microphone, permission is refused, or the host blocks it (a Claude artifact does).
export async function listen(onNote, onChord) {
  const context = audioContext();
  if (!context || !navigator.mediaDevices?.getUserMedia) throw new Error('No microphone available');

  // Phone voice processing mangles a guitar: ask for the raw signal.
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = 4096;
  source.connect(analyser);
  // Chords need a longer window than single notes: low strings a semitone apart are only ~5 Hz apart.
  const wide = context.createAnalyser();
  wide.fftSize = 16384;
  source.connect(wide);
  const block = new Float32Array(wide.fftSize);
  let tick = 0;

  const samples = new Float32Array(analyser.fftSize);
  let candidate = null;
  let frames = 0;
  let reported = null;
  let level = 0;
  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    // A jump in loudness is a fresh pick stroke: report the note again even if the pitch is unchanged.
    let energy = 0;
    for (let i = samples.length - 1024; i < samples.length; i++) energy += samples[i] * samples[i];
    const now = Math.sqrt(energy / 1024);
    if (now > level * 1.8 && now > 0.01) reported = null;
    level = now;
    const hz = detectPitch(samples, context.sampleRate);
    const midi = hz ? midiOf(hz) : null;
    frames = midi === candidate ? frames + 1 : 1;
    candidate = midi;
    // A note counts once it holds for two frames; silence must last longer, so a decaying string is not cut off.
    if (frames >= (midi == null ? 5 : 2) && midi !== reported) onNote((reported = midi));
    if (onChord && ++tick % 3 === 0) {
      wide.getFloatTimeDomainData(block);
      onChord(chromaOf(block, context.sampleRate));
    }
  }, 40);

  return () => {
    clearInterval(timer);
    source.disconnect();
    stream.getTracks().forEach((track) => track.stop());
  };
}
