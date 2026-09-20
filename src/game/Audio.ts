import type { Settings } from './model';
export type Sound = 'shot' | 'laser' | 'missile' | 'explosion' | 'item' | 'bomb' | 'hyper' | 'warning' | 'boss' | 'clear' | 'over';
export type AudioStatus = 'idle' | 'playing' | 'paused' | 'blocked' | 'unavailable';
export const musicTracks: Record<string, { file: string; name: string }> = {
  title: { file: 'title.wav', name: 'NEON HORIZON' },
  stage: { file: 'stage.wav', name: 'AFTERBURNER' },
  boss: { file: 'boss.wav', name: 'IRON PULSE' },
  final: { file: 'final.wav', name: 'BREAK THE CHOIR' },
  attack: { file: 'attack.wav', name: 'OVERCLOCK' },
  ending: { file: 'ending.wav', name: 'HOMEWARD LIGHT' },
};

/** BGM is pre-rendered stereo music, independent of frame rate and gameplay CPU load. */
export class AudioManager {
  context: AudioContext | null = null;
  settings: Settings;
  track = 'title';
  stage = 0;
  status: AudioStatus = 'idle';
  private music: HTMLAudioElement | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private started = false;
  private disposed = false;
  private paused = false;
  private previewTime = 0;
  private voices = 0;
  private lastSound: Partial<Record<Sound, number>> = {};
  private mediaBlocked = false;
  private playPending = false;
  constructor(settings: Settings) { this.settings = settings; }
  get muted() { return this.paused; }
  set muted(value: boolean) {
    if (value === this.paused) return;
    this.paused = value;
    if (value && !this.previewTime) this.music?.pause();
    else if (this.started) this.startMusic();
  }
  get trackName() { return (musicTracks[this.track] ?? musicTracks.stage).name; }
  private makeMusic() {
    if (this.music) return;
    const media = new Audio();
    media.loop = true; media.preload = 'auto';
    media.setAttribute('playsinline', '');
    media.src = new URL(`./audio/${(musicTracks[this.track] ?? musicTracks.stage).file}`, document.baseURI).href;
    media.addEventListener('error', () => { if (!this.disposed) this.status = 'unavailable'; });
    media.addEventListener('playing', () => { if (!this.disposed) { this.mediaBlocked = false; this.status = 'playing'; } });
    this.music = media;
  }
  private makeContext() {
    if (this.context && this.context.state !== 'closed') return;
    const Context = globalThis.AudioContext ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const c = new Context(); this.context = c;
    const master = c.createGain(), limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -10; limiter.knee.value = 12; limiter.ratio.value = 6;
    master.connect(limiter); limiter.connect(c.destination); this.master = master;
    this.noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    // A tiny buffer started inside the gesture primes older iOS audio implementations.
    const primer = c.createBufferSource(); primer.buffer = c.createBuffer(1, 1, c.sampleRate); primer.connect(master); primer.start(); primer.onended = () => primer.disconnect();
  }
  /** Call synchronously from click/touchend/keydown, not only pointerdown. */
  unlock() {
    if (this.disposed) return;
    this.started = true;
    try {
      const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
      if (session) session.type = 'playback';
    } catch { /* Audio Session is optional. */ }
    try { this.makeMusic(); this.mediaBlocked = false; this.startMusic(true); } catch { this.status = 'unavailable'; }
    try { this.makeContext(); void this.context?.resume().catch(() => { if (!this.disposed) this.status = 'blocked'; }); } catch { /* BGM can still play when Web Audio is unavailable. */ }
  }
  private startMusic(fromGesture = false) {
    const music = this.music;
    if (!music || this.disposed || !this.started || (this.playPending && !fromGesture)) return;
    const muted = this.paused && this.previewTime <= 0;
    music.volume = Math.max(0, Math.min(1, this.settings.music));
    music.muted = muted || this.settings.music <= 0;
    if (!fromGesture && (muted || music.muted || this.mediaBlocked)) return;
    this.playPending = true;
    try {
      const result = music.play();
      void Promise.resolve(result).then(() => { if (!this.disposed) this.mediaBlocked = false; }).catch(error => {
        // Changing tracks or pausing can cancel an in-flight play. That is not a permission failure.
        if (!this.disposed && error?.name !== 'AbortError') { this.mediaBlocked = true; this.status = 'blocked'; }
      }).finally(() => { this.playPending = false; });
    } catch { this.playPending = false; this.mediaBlocked = true; this.status = 'blocked'; }
  }
  setTrack(track: string, stage = 0) {
    this.stage = stage;
    if (this.track === track) return;
    this.track = track;
    if (this.music) {
      this.music.pause();
      this.music.src = new URL(`./audio/${(musicTracks[track] ?? musicTracks.stage).file}`, document.baseURI).href;
      this.playPending = false;
      this.startMusic();
    }
  }
  private tone(from: number, to: number, length: number, volume: number, type: OscillatorType = 'triangle', delay = 0) {
    const c = this.context;
    if (!c || c.state !== 'running' || !this.master || this.voices >= 28) return;
    const osc = c.createOscillator(), gain = c.createGain(), start = c.currentTime + delay;
    osc.type = type; osc.frequency.setValueAtTime(from, start); osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length);
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(volume, start + .004); gain.gain.exponentialRampToValueAtTime(.0001, start + length);
    osc.connect(gain); gain.connect(this.master); this.voices++;
    osc.onended = () => { this.voices--; osc.disconnect(); gain.disconnect(); };
    osc.start(start); osc.stop(start + length + .01);
  }
  private burst(length: number, volume: number, cutoff = 1400) {
    const c = this.context;
    if (!c || !this.noise || !this.master || this.voices >= 28) return;
    const source = c.createBufferSource(), filter = c.createBiquadFilter(), gain = c.createGain();
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, c.currentTime); filter.frequency.exponentialRampToValueAtTime(90, c.currentTime + length);
    gain.gain.setValueAtTime(volume, c.currentTime); gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + length);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); this.voices++;
    source.onended = () => { this.voices--; source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(); source.stop(c.currentTime + length);
  }
  play(sound: Sound) {
    if (this.disposed || (this.paused && this.previewTime <= 0) || this.settings.sfx <= 0 || this.context?.state !== 'running') return;
    // Sound failures must never abort the animation loop or stop an iPhone sortie.
    try {
      const now = this.context.currentTime;
      if (now - (this.lastSound[sound] ?? -Infinity) < (sound === 'explosion' ? .055 : .025)) return;
      this.lastSound[sound] = now;
      if (this.master) this.master.gain.value = this.settings.sfx * .7;
      if (sound === 'shot') { this.tone(1500, 420, .07, .085, 'square'); this.tone(700, 260, .06, .07); }
      if (sound === 'laser') { this.tone(2100, 320, .15, .13, 'sawtooth'); this.tone(1050, 160, .13, .08); }
      if (sound === 'missile') { this.burst(.22, .13, 1900); this.tone(350, 70, .24, .12); }
      if (sound === 'explosion') { this.burst(.28, .25); this.tone(125, 32, .27, .2, 'sine'); }
      if (sound === 'bomb') { this.burst(.85, .5, 3500); this.tone(180, 28, .8, .35, 'sine'); this.tone(700, 50, .4, .13, 'sawtooth'); }
      if (sound === 'item' || sound === 'clear') [0, 4, 7, 12].forEach((n, i) => this.tone(440 * 2 ** (n / 12), 440 * 2 ** (n / 12), .22, .14, 'triangle', i * .075));
      if (sound === 'hyper') { this.tone(150, 1800, .6, .19, 'sawtooth'); this.tone(300, 2400, .65, .12); }
      if (sound === 'warning' || sound === 'boss') for (let i = 0; i < 3; i++) this.tone(sound === 'boss' ? 140 : 660, sound === 'boss' ? 70 : 540, .2, .19, 'sawtooth', i * .25);
      if (sound === 'over') [440, 330, 220, 110].forEach((n, i) => this.tone(n, n * .75, .35, .15, 'triangle', i * .16));
    } catch { /* A failed audio node does not affect simulation. Retry on the next user gesture. */ }
  }
  preview() {
    this.previewTime = 5; this.unlock();
    if (this.context) void this.context.resume().then(() => { if (!this.disposed) this.play('clear'); }).catch(() => {});
  }
  update(dt: number) {
    if (this.disposed) return;
    try {
      const wasPreviewing = this.previewTime > 0;
      this.previewTime = Math.max(0, this.previewTime - dt);
      const quiet = this.paused && this.previewTime <= 0;
      if (this.master) this.master.gain.value = quiet ? 0 : this.settings.sfx * .7;
      if (this.music) {
        this.music.volume = Math.max(0, Math.min(1, this.settings.music)); this.music.muted = quiet || this.settings.music <= 0;
        if (quiet && !this.music.paused) this.music.pause();
        if (!quiet && this.music.paused && this.started && !this.mediaBlocked) this.startMusic();
        if (wasPreviewing && !this.previewTime && quiet) this.music.pause();
      }
      const contextBlocked = this.started && this.settings.sfx > 0 && this.context && this.context.state !== 'running';
      if (this.status !== 'unavailable') this.status = !this.started ? 'idle' : quiet ? 'paused' : this.mediaBlocked || contextBlocked ? 'blocked' : 'playing';
    } catch { this.status = 'unavailable'; }
  }
  dispose() {
    this.disposed = true; this.music?.pause(); this.music?.removeAttribute('src'); this.music?.load(); this.music = null;
    if (this.context && this.context.state !== 'closed') void this.context.close().catch(() => {});
  }
}
