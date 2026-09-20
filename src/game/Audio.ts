import type { Settings } from './model';
export type Sound = 'shot' | 'laser' | 'missile' | 'explosion' | 'item' | 'bomb' | 'hyper' | 'warning' | 'boss' | 'clear' | 'over';
const tones: Record<Sound, [number, number, number]> = { shot: [820, 170, .045], laser: [1300, 240, .09], missile: [240, 90, .12], explosion: [110, 28, .18], item: [660, 1200, .16], bomb: [140, 22, .65], hyper: [160, 1400, .6], warning: [420, 390, .45], boss: [80, 160, .8], clear: [440, 880, .75], over: [330, 65, .9] };
export class AudioManager {
  context: AudioContext | null = null;
  settings: Settings;
  track = 'title';
  stage = 0;
  beat = 0;
  timer = 0;
  muted = false;
  constructor(settings: Settings) { this.settings = settings; }
  unlock() { try { this.context ??= new AudioContext(); void this.context.resume().catch(() => {}); } catch { /* Silent play remains available. */ } }
  setTrack(track: string, stage = 0) { if (this.track !== track || this.stage !== stage) { this.track = track; this.stage = stage; this.beat = 0; this.timer = 0; } }
  tone(from: number, to: number, length: number, volume: number, type: OscillatorType = 'triangle') {
    const c = this.context; if (!c || c.state !== 'running' || volume <= 0 || this.muted) return;
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from, c.currentTime); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), c.currentTime + length);
    gain.gain.setValueAtTime(volume * .15, c.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + length);
    osc.connect(gain); gain.connect(c.destination); osc.start(); osc.stop(c.currentTime + length); osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  play(sound: Sound) { const t = tones[sound]; this.tone(...t, this.settings.sfx, sound === 'explosion' || sound === 'bomb' ? 'sawtooth' : 'triangle'); }
  update(dt: number) {
    if (this.muted) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    const combat = this.track === 'boss' || this.track === 'final';
    this.timer = combat ? .18 : this.track === 'ending' ? .38 : .26;
    const pattern = this.track === 'ending' ? [0, 4, 7, 11, 12, 7, 4, 7] : combat ? [0, 0, 7, 1, 0, 10, 7, 3] : [0, 7, 12, 3, 10, 7, 5, 3];
    const root = (this.track === 'title' ? 110 : this.track === 'attack' ? 130.81 : 98) * 2 ** (this.stage % 4 / 12);
    const note = root * 2 ** (pattern[this.beat % 8] / 12);
    this.tone(note, note, this.timer * .85, this.settings.music * .65, 'triangle');
    if (this.beat % 4 === 0) this.tone(root / 2, root / 2, this.timer * 3, this.settings.music * .8, 'sine');
    this.beat++;
  }
  dispose() { void this.context?.close(); }
}
