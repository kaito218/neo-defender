import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import ts from 'typescript';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-defender-tests-'));
function compile(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) compile(file);
    else if (file.endsWith('.ts')) {
      const output = path.join(temp, path.relative('src', file).replace(/\.ts$/, '.js'));
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
    }
  }
}
compile('src/game'); compile('src/data');
after(() => fs.rmSync(temp, { recursive: true, force: true }));
const require = createRequire(import.meta.url);
const { Game } = require(path.join(temp, 'game/Game.js'));
const { emptyInput, InputManager } = require(path.join(temp, 'game/InputManager.js'));
const { freshSave, parseSave } = require(path.join(temp, 'game/SaveData.js'));
const { weaponStats, weaponOrder, weaponScale } = require(path.join(temp, 'data/weapons.js'));
const { endingText } = require(path.join(temp, 'data/story.js'));
const { stages } = require(path.join(temp, 'data/stages.js'));
const sound = { setTrack() {}, play() {} };
const make = (mode = 'story', stage = 1, save = freshSave()) => new Game(mode, stage, save, sound, () => {});
const tick = (g, seconds, input = {}) => { for (let t = 0; t < seconds; t += 1 / 60) g.update(1 / 60, { ...emptyInput(), ...input }); };

test('all weapon levels follow the specified DPS curve without projectile multiplication', () => {
  for (const w of weaponOrder) {
    const base = weaponStats(w, 1); const dps = base.damage * base.count / base.interval;
    for (let level = 1; level <= 5; level++) {
      const s = weaponStats(w, level); assert.ok(Math.abs(s.damage * s.count / s.interval / dps - weaponScale[level - 1]) < 1e-9);
    }
  }
});
test('corrupt saves recover; settings, branches, unlocks and progress round trip', () => {
  assert.deepEqual(parseSave('{bad').unlocked, ['A']);
  const save = freshSave(); save.unlocked.push('D'); save.selected = 'D'; save.cleared = [1, 2]; save.nextStage = 3; save.allies = ['mira']; save.choices.signal = 'rescue'; save.settings.autoShot = true;
  assert.deepEqual(parseSave(JSON.stringify(save)), save);
  const malformed = parseSave(JSON.stringify({ version: 2, selected: 'Z', unlocked: ['Z'], cleared: [0, 1, 99, 1], nextStage: 100, settings: { music: 300, touchOffset: -8 } }));
  assert.equal(malformed.selected, 'A'); assert.deepEqual(malformed.cleared, [1]); assert.equal(malformed.nextStage, 2); assert.equal(malformed.settings.music, 1); assert.equal(malformed.settings.touchOffset, 0);
});
test('touch moves at ship speed, does not teleport, stops on release and preserves movement during bomb', () => {
  const g = make(); g.begin(); const x = g.player.x;
  g.update(1 / 60, { ...emptyInput(), target: { x: 900, y: 300 } });
  assert.ok(g.player.x > x && g.player.x - x <= g.ship.speed / 60);
  const p = { ...g.player }; tick(g, .2); assert.equal(g.player.x, p.x); assert.equal(g.player.y, p.y);
  const i = new InputManager(() => {}); i.beginMove(1, { x: 100, y: 200 }); i.button(2, 'bomb');
  assert.equal(i.sample().bomb, true); assert.equal(i.sample().bomb, false); assert.deepEqual(i.target, { x: 100, y: 200 });
  i.release(2); assert.equal(i.pointer, 1); i.release(1); assert.equal(i.target, null);
});
test('keyboard input and simulated standard gamepad support deadzones, button edges and disconnect', () => {
  let pad = null; const original = Object.getOwnPropertyDescriptor(globalThis.navigator, 'getGamepads');
  Object.defineProperty(globalThis.navigator, 'getGamepads', { configurable: true, value: () => [pad] });
  const messages = []; const i = new InputManager(t => messages.push(t));
  i.held.add('KeyD'); i.held.add('Space'); assert.equal(i.sample().moveX, 1); assert.equal(i.sample().shoot, true); i.held.clear();
  pad = { connected: true, axes: [.1, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) };
  assert.equal(i.sample().moveX, 0); assert.equal(messages[0], 'GAMEPAD CONNECTED');
  pad.axes = [.8, -.7]; pad.buttons[1].pressed = true; let s = i.sample(); assert.ok(s.moveX > 0 && s.moveY < 0); assert.equal(s.bomb, true); assert.equal(i.sample().bomb, false);
  i.reset(); assert.equal(i.sample().moveX, 0); pad.axes = [0, 0]; pad.buttons[1].pressed = false; i.sample(); pad.buttons[3].pressed = true; assert.equal(i.sample().hyper, true);
  pad = null; i.sample(); assert.equal(messages.at(-1), 'GAMEPAD DISCONNECTED');
  if (original) Object.defineProperty(globalThis.navigator, 'getGamepads', original); else delete globalThis.navigator.getGamepads;
});
test('each route traverses all seven stage bosses and reaches its ending', () => {
  const endings = new Set();
  for (const signal of ['rescue', 'pursue']) for (const trust of ['trust', 'secure']) {
    const g = make();
    for (let stage = 1; stage <= 7; stage++) {
      assert.equal(g.stage, stage); g.begin(); g.invincible = 1e9;
      // Advance the actual event scheduler, including branch pauses, to each boss.
      for (let frame = 0; frame < 8000 && !g.enemies.some(e => e.kind === 'boss'); frame++) {
        if (g.status === 'choice') g.choose(stage === 2 ? signal : trust);
        g.invincible = 1e9; g.update(1 / 60, emptyInput());
      }
      const boss = g.enemies.find(e => e.kind === 'boss'); assert.ok(boss, `boss ${stage} must spawn independent of score`);
      boss.hp = boss.maxHp * .6; g.update(1 / 60, emptyInput()); assert.equal(boss.phase, 2);
      boss.hp = boss.maxHp * .2; g.update(1 / 60, emptyInput()); assert.equal(boss.phase, 3);
      boss.hp = 0; g.update(1 / 60, emptyInput()); assert.equal(g.status, 'clear'); assert.ok(g.save.cleared.includes(stage));
      g.nextStage();
    }
    assert.equal(g.status, 'ending'); assert.equal(g.bossKills, 7); assert.ok(g.save.unlocked.includes('B')); assert.ok(g.save.unlocked.includes('C')); assert.ok(g.save.unlocked.includes('E'));
    assert.equal(g.roster.includes('mira'), signal === 'rescue'); assert.equal(g.roster.includes('gale'), trust === 'trust'); assert.ok(g.roster.includes('noa'));
    assert.equal(g.save.unlocked.includes('D'), signal === 'rescue'); assert.equal(g.save.choices.signal, signal); assert.equal(g.save.choices.trust, trust);
    endings.add(endingText(g.route).title);
  }
  assert.equal(endings.size, 3);
});
test('bomb defeats a boss through the regular reward/clear pipeline', () => {
  const g = make(); g.begin(); g.spawnEnemy('boss', 800, 220); g.enemies[0].hp = 100;
  g.update(1 / 60, { ...emptyInput(), bomb: true }); assert.equal(g.status, 'clear'); assert.equal(g.bossKills, 1); assert.equal(g.bombs, 2);
});
test('score attack continues after bosses and schedules 3, 6, 10, 15, 20 minute encounters', () => {
  const g = make('attack'); g.invincible = 1e9;
  for (const threshold of [180, 360, 600, 900, 1200]) {
    g.time = threshold; g.update(1 / 60, emptyInput()); assert.ok(g.warning > 0); tick(g, 3.2);
    const boss = g.enemies.find(e => e.kind === 'boss'); assert.ok(boss); boss.hp = 0;
    g.update(1 / 60, emptyInput()); assert.equal(g.status, 'playing');
  }
  assert.equal(g.bossKills, 5); assert.equal(g.nextBoss, 1500); assert.equal(g.tier, 'VERY HARD'); assert.equal(g.save.cleared.length, 0);
  g.invincible = 0; g.hp = 1; g.damage(); assert.equal(g.status, 'over'); assert.ok(g.save.highs.attack > 0);
});
test('non-playing states freeze all combat clocks and resources', () => {
  const g = make(); const start = JSON.stringify(g.snapshot()); tick(g, 5, { shoot: true, bomb: true }); assert.equal(JSON.stringify(g.snapshot()), start);
  g.begin(); g.status = 'choice'; const time = g.time; tick(g, 5); assert.equal(g.time, time);
});
test('new sorties cannot inherit later branch allies; replay starts only with earlier choices', () => {
  const save = freshSave(); save.choices = { signal: 'rescue', trust: 'trust' }; save.allies = ['mira', 'gale', 'noa'];
  assert.deepEqual(make('story', 1, structuredClone(save)).roster, []); assert.deepEqual(make('story', 3, structuredClone(save)).roster, ['mira']); assert.deepEqual(make('story', 7, structuredClone(save)).roster, ['mira', 'gale', 'noa']);
});
test('objects are bounded and removed offscreen; all stage events are ordered', () => {
  const g = make('attack'); g.invincible = 1e9; g.save.settings.autoShot = true;
  tick(g, 120); assert.ok(g.bullets.length <= 650); assert.ok(g.enemies.length <= 42); assert.ok(g.particles.length <= 240);
  for (const s of stages) for (let i = 1; i < s.events.length; i++) assert.ok(s.events[i].at >= s.events[i - 1].at);
});


test('a quick touch button press between frames is delivered once', () => {
  const i = new InputManager(() => {});
  i.button(10, 'bomb'); i.release(10);
  assert.equal(i.sample().bomb, true); assert.equal(i.sample().bomb, false);
  i.button(11, 'dash'); i.reset(); assert.equal(i.sample().dash, false);
});

const { AudioManager, musicTracks } = require(path.join(temp, 'game/Audio.js'));
test('music unlock, pause, track changes, rejected playback and recovery', async () => {
  const oldAudio = globalThis.Audio, oldDocument = globalThis.document;
  const media = [];
  class FakeAudio {
    paused = true; volume = 1; muted = false; calls = 0; fail = false;
    constructor() { media.push(this); }
    setAttribute() {} addEventListener() {} removeAttribute() {} load() {}
    play() { this.calls++; if (this.fail) return Promise.reject({ name: 'NotAllowedError' }); this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  globalThis.Audio = FakeAudio; globalThis.document = { baseURI: 'https://example.test/neo-defender/' };
  const flush = async () => { for (let n = 0; n < 5; n++) await Promise.resolve(); };
  const manager = new AudioManager(freshSave().settings);
  try {
    manager.unlock(); assert.equal(media[0].calls, 1); assert.match(media[0].src, /neo-defender\/audio\/title.wav$/);
    await flush(); manager.update(.1); assert.equal(manager.status, 'playing');
    manager.muted = true; manager.update(.1); assert.equal(media[0].paused, true); assert.equal(manager.status, 'paused');
    manager.muted = false; await flush(); assert.equal(media[0].paused, false);
    manager.setTrack('boss'); await flush(); assert.match(media[0].src, /boss.wav$/);
    media[0].fail = true; media[0].pause(); manager.unlock(); await flush(); manager.update(.1); assert.equal(manager.status, 'blocked');
    const attempts = media[0].calls; manager.update(.1); assert.equal(media[0].calls, attempts);
    media[0].fail = false; manager.unlock(); await flush(); manager.update(.1); assert.equal(manager.status, 'playing');
    manager.muted = true; manager.preview(); await flush(); manager.update(.1); assert.equal(media[0].muted, false);
    manager.update(6); assert.equal(media[0].paused, true);
    manager.context = { state: 'running', currentTime: 10, createOscillator() { throw new Error('audio unavailable'); } };
    manager.muted = false; assert.doesNotThrow(() => manager.play('shot')); manager.context = null;
    manager.dispose(); assert.equal(media[0].paused, true);
  } finally { manager.context = null; manager.dispose(); globalThis.Audio = oldAudio; globalThis.document = oldDocument; }
});
test('all six original BGM assets contain valid, non-silent stereo PCM without clipping', () => {
  assert.equal(Object.keys(musicTracks).length, 6);
  for (const { file } of Object.values(musicTracks)) {
    const wav = fs.readFileSync(path.join('public/audio', file));
    assert.equal(wav.toString('ascii', 0, 4), 'RIFF'); assert.equal(wav.toString('ascii', 8, 12), 'WAVE');
    assert.equal(wav.readUInt16LE(22), 2); assert.equal(wav.readUInt32LE(24), 22050); assert.equal(wav.readUInt16LE(34), 16);
    assert.equal(wav.readUInt32LE(40), wav.length - 44);
    let peak = 0, energy = 0;
    for (let i = 44; i < wav.length; i += 2) { const sample = wav.readInt16LE(i) / 32768; peak = Math.max(peak, Math.abs(sample)); energy += sample * sample; }
    assert.ok(peak > .5 && peak < .95, file); assert.ok(Math.sqrt(energy / ((wav.length - 44) / 2)) > .03, file);
  }
});
