// Original procedural synthwave score. No external recordings or samples.
// Run: node scripts/create-music.mjs. Output: 22.05 kHz stereo PCM WAV.
import fs from 'node:fs';
import path from 'node:path';
const sr = 22050;
const tracks = [
  { id: 'title', bpm: 112, bars: 8, root: 40, drive: .65, melody: [19, 22, 26, 22, 19, 17, 14, 17] },
  { id: 'stage', bpm: 138, bars: 16, root: 40, drive: 1, melody: [19, 19, 22, 26, 24, 22, 19, 17] },
  { id: 'boss', bpm: 156, bars: 8, root: 38, drive: 1.18, melody: [12, 15, 19, 20, 19, 15, 14, 12] },
  { id: 'final', bpm: 164, bars: 16, root: 40, drive: 1.25, melody: [26, 24, 22, 19, 22, 26, 29, 26] },
  { id: 'attack', bpm: 148, bars: 8, root: 42, drive: 1.1, melody: [19, 22, 19, 26, 24, 19, 17, 14] },
  { id: 'ending', bpm: 96, bars: 8, root: 43, drive: .38, melody: [19, 24, 23, 19, 16, 19, 14, 12] },
];
let seed = 17;
const noise = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2147483648 - 1; };
const freq = n => 440 * 2 ** ((n - 69) / 12);
for (const song of tracks) {
  const beat = 60 / song.bpm, duration = song.bars * 4 * beat, length = Math.round(duration * sr);
  const left = new Float32Array(length), right = new Float32Array(length);
  const put = (start, duration, fn, pan = 0, gain = 1) => {
    const offset = Math.round(start * sr), count = Math.ceil(duration * sr);
    const l = Math.sqrt((1 - pan) / 2) * gain, r = Math.sqrt((1 + pan) / 2) * gain;
    for (let i = 0; i < count; i++) { const v = fn(i / sr, i); const index = (offset + i) % length; left[index] += v * l; right[index] += v * r; }
  };
  const note = (at, midi, len, volume, pan, kind = 'lead') => {
    const f = freq(midi);
    put(at, len, t => {
      const attack = Math.min(1, t / .009), release = Math.min(1, (len - t) / .06);
      const phase = 2 * Math.PI * f * t;
      const wave = kind === 'bass' ? Math.sin(phase) + .3 * Math.sin(phase * 2) + .13 * Math.sin(phase * 3)
        : Math.sin(phase) + .35 * Math.sin(phase * 1.004) + .18 * Math.sin(phase * 2) + .07 * Math.sin(phase * 3);
      const decay = kind === 'arp' ? Math.exp(-t * 15) : kind === 'bass' ? Math.exp(-t * 5) : .7 + .3 * Math.exp(-t * 7);
      return wave * attack * Math.max(0, release) * decay;
    }, pan, volume);
    if (kind === 'lead' || kind === 'arp') put(at + beat * .75, len, t => Math.sin(2 * Math.PI * f * t) * Math.min(1, t / .015) * Math.max(0, 1 - t / len) * Math.exp(-t * 4), -pan, volume * .2);
  };
  const progression = song.id === 'ending' ? [0, 5, 7, 0] : [0, -5, 3, -2];
  for (let bar = 0; bar < song.bars; bar++) {
    const at = bar * 4 * beat, root = song.root + progression[Math.floor(bar / 2) % 4];
    // Low bass pulse, offbeat octave and stereo sixteenth-note arpeggio.
    for (let s = 0; s < 8; s++) note(at + s * beat / 2, root + (s === 3 || s === 7 ? 12 : 0), beat * .43, .16 * song.drive, 0, 'bass');
    const chord = (bar % 8 === 4 || song.id === 'ending') ? [0, 4, 7, 12] : [0, 3, 7, 12];
    for (let s = 0; s < 16; s++) note(at + s * beat / 4, root + 24 + chord[s % 4], beat * .38, .044, s % 2 ? .6 : -.6, 'arp');
    // Soft harmonic bed with rhythmic ducking under the kick.
    for (const interval of chord.slice(0, 3)) {
      const f = freq(root + 12 + interval);
      put(at, beat * 4, t => {
        const envelope = Math.min(1, t / .15) * Math.min(1, (beat * 4 - t) / .2);
        const duck = .3 + .7 * Math.min(1, (t % beat) / .22);
        return (Math.sin(2 * Math.PI * f * t) + .3 * Math.sin(2 * Math.PI * f * 1.006 * t)) * envelope * duck;
      }, interval === 0 ? -.5 : .5, .032);
    }
    // Original melody: alternate phrase endings and a raised second chorus.
    for (let s = 0; s < 8; s++) {
      if ((song.id === 'title' && bar < 2 && s % 2) || (s === 7 && bar % 2 === 0)) continue;
      const n = song.melody[(s + (bar % 4 === 3 ? 2 : 0)) % 8] + root + (bar >= 8 && bar % 4 > 1 ? 12 : 0);
      note(at + s * beat / 2, n, beat * (s === 7 ? .85 : .43), song.id === 'ending' ? .075 : .066, .15);
    }
    for (let b = 0; b < 4; b++) {
      const t = at + b * beat;
      // Kick with pitched punch, sub tail, snare/clap, closed and open hats.
      if (song.id !== 'ending' || b % 2 === 0) put(t, .34, x => Math.sin(2 * Math.PI * (46 * x + 1.85 * (1 - Math.exp(-x * 35)))) * Math.exp(-x * 15), 0, .52 * song.drive);
      if (b % 2) {
        put(t, .18, x => (noise() * .7 + Math.sin(2 * Math.PI * 185 * x) * .3) * Math.exp(-x * 26), -.1, .18 * song.drive);
        for (let clap = 0; clap < 3; clap++) put(t + clap * .012, .075, x => noise() * Math.exp(-x * 45), .2, .055 * song.drive);
      }
      for (let h = 0; h < 2; h++) {
        let previous = 0;
        put(t + h * beat / 2, h ? .12 : .045, x => { const n = noise(); const high = n - previous; previous = n; return high * Math.exp(-x * (h ? 40 : 100)); }, h ? .65 : -.65, h ? .031 : .025);
      }
    }
    if (bar % 4 === 3) for (let fill = 0; fill < 4; fill++) put(at + beat * (3 + fill / 4), .13, t => (Math.sin(2 * Math.PI * (130 - fill * 12) * t) + noise() * .15) * Math.exp(-t * 26), (fill - 1.5) / 3, .08 * song.drive);
    if (bar % 4 === 0) put(at, .65, t => noise() * Math.exp(-t * 9), -.2, .055 * song.drive);
  }
  let peak = 0;
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  const gain = .88 / Math.max(.1, peak), bytes = length * 4;
  const wav = Buffer.alloc(44 + bytes);
  wav.write('RIFF'); wav.writeUInt32LE(36 + bytes, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(sr, 24); wav.writeUInt32LE(sr * 4, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(bytes, 40);
  for (let i = 0; i < length; i++) {
    // 4ms end/start taper removes boundary clicks without an audible loop gap.
    const edge = Math.min(1, i / 88, (length - 1 - i) / 88);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i] * gain * edge)) * 32767), 44 + i * 4);
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i] * gain * edge)) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(path.join('public/audio', `${song.id}.wav`), wav);
  console.log(`${song.id}: ${duration.toFixed(2)}s, ${(wav.length / 1048576).toFixed(2)} MiB, peak ${(peak * gain).toFixed(2)}`);
}
