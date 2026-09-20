import { W, H, clamp, overlaps } from './model';
import type { Ally, AllyId, Bullet, Dialogue, Enemy, EnemyKind, Input, Item, ItemKind, Mode, Obstacle, Particle, Save, Snapshot, Status, Weapon } from './model';
import { shipById } from '../data/ships';
import { weaponOrder, weaponStats } from '../data/weapons';
import { enemies as enemyData } from '../data/enemies';
import { stages } from '../data/stages';
import { bosses } from '../data/bosses';
import { allies as allyData } from '../data/allies';
import { choices } from '../data/story';
import type { AudioManager } from './Audio';

export class Game {
  save: Save;
  audio: AudioManager;
  persist: () => void;
  mode: Mode;
  stage: number;
  startStage: number;
  ship;
  status: Status = 'intro';
  player = { x: 150, y: 350, w: 56, h: 28 };
  hp = 5;
  bombs = 3;
  weapon: Weapon = 'TWIN';
  levels: Record<Weapon, number> = { TWIN: 1, SPREAD: 1, LASER: 1, HOMING: 1 };
  bullets: Bullet[] = [];
  enemies: Enemy[] = [];
  particles: Particle[] = [];
  items: Item[] = [];
  obstacles: Obstacle[] = [];
  allies: Ally[] = [];
  route: Record<string, string> = {};
  roster: AllyId[] = [];
  stageTime = 0;
  time = 0;
  scroll = 0;
  score = 0;
  combo = 0;
  maxCombo = 0;
  comboTime = 0;
  kills = 0;
  bossKills = 0;
  stageDamage = 0;
  hyper = 0;
  hyperTime = 0;
  slow = 100;
  slowing = false;
  dash = 0;
  dashTime = 0;
  invincible = 1.8;
  barrier = 0;
  droneCount = 0;
  shot = 0;
  spawn = 1.4;
  eventIndex = 0;
  bossSpawned = false;
  warning = 0;
  nextBoss = 180;
  bossIndex = 0;
  dialogue: Dialogue | null = null;
  dialogueTime = 0;
  flash = 0;
  shake = 0;
  nextId = 1;
  constructor(mode: Mode, stage: number, save: Save, audio: AudioManager, persist: () => void) {
    this.mode = mode; this.stage = stage; this.startStage = stage; this.save = save; this.audio = audio; this.persist = persist;
    this.ship = shipById(save.selected); this.hp = this.ship.hp; this.weapon = this.ship.weapon;
    this.droneCount = this.ship.id === 'D' ? 2 : 0;
    // A replay only inherits decisions from earlier chapters; later choices cannot leak backwards.
    if (stage > 2 && save.choices.signal) this.route.signal = save.choices.signal;
    if (stage > 4 && save.choices.trust) this.route.trust = save.choices.trust;
    if (stage > 2 && this.route.signal === 'rescue') this.roster.push('mira');
    if (stage > 4 && this.route.trust === 'trust') this.roster.push('gale');
    if (stage > 5) this.roster.push('noa');
    if (mode === 'attack') this.roster = [...save.allies];
    this.loadStage();
    if (mode === 'attack') this.status = 'playing';
  }
  get data() { return stages[this.stage - 1]; }
  get difficulty() { return this.mode === 'attack' ? 1 + Math.min(4, this.time / 180) * .27 : ({ EASY: .75, NORMAL: 1, HARD: 1.3 }[this.save.settings.difficulty]); }
  get tier() { return this.time < 180 ? 'EASY' : this.time < 360 ? 'NORMAL' : this.time < 600 ? 'HARD' : 'VERY HARD'; }
  get bossData() { return bosses[this.mode === 'story' ? this.stage - 1 : this.bossIndex % bosses.length]; }
  loadStage() {
    this.stageTime = 0; this.eventIndex = 0; this.bossSpawned = false; this.warning = 0; this.stageDamage = 0;
    this.enemies = []; this.bullets = []; this.items = []; this.obstacles = []; this.particles = [];
    this.player.x = 150; this.player.y = 345; this.invincible = 2; this.spawn = 1.4;
    this.status = 'intro'; this.dialogue = this.data.intro;
    if (this.stage === 3 && this.route.signal === 'rescue') this.dialogue = { name: 'MIRA', text: '今度は私が援護する。あの時、助けてくれてありがとう。補給基地まで一緒に飛ぼう！' };
    this.syncAllies(); this.audio.setTrack(this.mode === 'attack' ? 'attack' : 'stage', this.data.bgm);
    if (this.mode === 'story') {
      this.save.nextStage = this.stage;
      this.save.choices = { ...this.route };
      this.persist();
    }
  }
  syncAllies() { this.allies = this.roster.map((id, i) => ({ id, x: this.player.x - 50, y: this.player.y + (i - 1) * 60, fire: .5 + i * .2, cooldown: 0, support: 12 })); }
  begin() { if (this.status === 'intro') { this.status = 'playing'; this.dialogue = null; } }
  nextStage() { if (this.status !== 'clear') return; if (this.stage === stages.length) { this.status = 'ending'; this.audio.setTrack('ending'); } else { this.stage++; this.hp = Math.min(this.ship.hp, this.hp + 2); this.bombs = Math.min(5, this.bombs + 1); this.loadStage(); } }
  unlock(id: Save['selected']) { if (!this.save.unlocked.includes(id)) this.save.unlocked.push(id); }
  recruit(id: AllyId) { if (!this.roster.includes(id)) this.roster.push(id); if (!this.save.allies.includes(id)) this.save.allies.push(id); this.syncAllies(); }
  choose(option: string) {
    if (this.status !== 'choice') return;
    const choice = choices[this.stage as 2 | 4]; if (!choice || !choice.options.some(o => o.id === option)) return;
    this.route[choice.key] = option; this.save.choices[choice.key] = option;
    if (option === 'rescue') { this.recruit('mira'); this.unlock('D'); this.say('MIRA', '援護に入る！ドローン機ORBITの設計データも転送する。'); this.wave('drone', 6); }
    if (option === 'pursue') { this.levels.LASER = Math.min(5, this.levels.LASER + 1); this.weapon = 'LASER'; this.say('LEO', '敵司令艦を捕捉。光学兵装を強化して追撃する。'); this.wave('fast', 5); }
    if (option === 'trust') { this.recruit('gale'); this.say('GALE', '信じてくれた礼は、この空で返す。防御支援を開始する。'); this.wave('turret', 3); }
    if (option === 'secure') { for (const w of weaponOrder) this.levels[w] = Math.min(5, this.levels[w] + 1); this.say('COMMAND', '機密データを解析、全兵装を更新した。敵も通信網を使って増援を送っている。'); this.wave('shield', 4); }
    this.persist(); this.status = 'playing'; this.invincible = 2;
  }
  say(name: string, text: string) { this.dialogue = { name, text }; this.dialogueTime = 6; }
  explosion(x: number, y: number, color: string, count = 18) {
    for (let i = 0; i < count && this.particles.length < 240; i++) this.particles.push({ x, y, vx: (Math.random() - .5) * 300, vy: (Math.random() - .5) * 300, life: .4 + Math.random() * .5, color, size: 2 + Math.random() * 5 });
  }
  spawnEnemy(kind: EnemyKind, x = W + 30, y = 110 + Math.random() * 490) {
    if (this.enemies.length >= 42) return;
    const d = enemyData[kind];
    const stageFactor = this.mode === 'attack' ? 1 + this.time / 500 : 1 + (this.stage - 1) * .07;
    const hp = (kind === 'boss' ? this.bossData.hp : d.hp) * stageFactor * this.difficulty * (kind === 'boss' && this.route.trust === 'secure' ? 1.13 : 1);
    const final = kind === 'boss' && this.bossData === bosses[6];
    this.enemies.push({ id: this.nextId++, kind, x, y, w: final ? 460 : d.w, h: final ? 300 : d.h, hp, maxHp: hp, shield: kind === 'shield' ? 35 * this.difficulty : 0, age: 0, fire: kind === 'boss' ? 2.5 : 1.2 + Math.random(), baseY: y, phase: 1, variant: this.stage % 3, warned: false });
  }
  wave(kind: EnemyKind, count: number) { for (let i = 0; i < count; i++) this.spawnEnemy(kind, W + 30 + i * 70, 100 + i * 450 / Math.max(1, count - 1)); }
  fire(x: number, y: number, weapon: Weapon, level: number, power = 1) {
    const stats = weaponStats(weapon, level);
    const boost = this.hyperTime > 0 ? 1.45 : 1;
    for (let i = 0; i < stats.count; i++) {
      const angle = weapon === 'SPREAD' ? (i - 2) * (level >= 3 ? .15 : .12) : weapon === 'HOMING' ? (i ? .24 : -.24) : 0;
      this.bullets.push({ x, y: y + (weapon === 'TWIN' ? (i ? 7 : -7) : 0), w: weapon === 'LASER' ? 74 : 20, h: weapon === 'LASER' ? 5 : 6, vx: Math.cos(angle) * (weapon === 'HOMING' ? 470 : 930), vy: Math.sin(angle) * 930, power: stats.damage * power * boost, friendly: true, weapon, life: 2.4, grazed: false, hits: [], pierce: weapon === 'LASER' || (weapon === 'TWIN' && level === 5) });
    }
  }
  enemyFire(e: Enemy) {
    const cx = e.x + 10, cy = e.y + e.h / 2;
    const aim = Math.atan2(this.player.y + 14 - cy, this.player.x + 28 - cx);
    const boss = e.kind === 'boss' || e.kind === 'midboss';
    const count = boss ? 4 + e.phase * 2 + (this.mode === 'attack' ? Math.floor(this.time / 240) : 0) : e.kind === 'cruiser' ? 5 : e.kind === 'missile' || e.kind === 'shield' ? 3 : 1;
    for (let i = 0; i < Math.min(count, 18) && this.bullets.length < 650; i++) {
      const a = aim + (i - (count - 1) / 2) * (boss ? .16 : .19);
      const speed = (e.kind === 'sniper' ? 510 : 185 + e.phase * 22) * Math.min(1.8, this.difficulty);
      this.bullets.push({ x: cx, y: cy, w: e.kind === 'laser' ? 95 : 11, h: e.kind === 'laser' ? 12 : 11, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, power: 1, friendly: false, weapon: e.kind === 'missile' ? 'HOMING' : 'TWIN', life: 9, grazed: false, hits: [], pierce: false });
    }
    if (boss && e.phase >= 2) {
      const offset = e.age * .28;
      for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + offset; this.bullets.push({ x: cx, y: cy, w: 10, h: 10, vx: Math.cos(a) * 155, vy: Math.sin(a) * 155, power: 1, friendly: false, weapon: 'TWIN', life: 9, grazed: false, hits: [], pierce: false }); }
    }
    if (e.kind === 'mother') { this.spawnEnemy('drone', e.x - 20, e.y - 20); this.spawnEnemy('drone', e.x - 20, e.y + e.h); }
    if (e.kind === 'boss') {
      const pattern = this.mode === 'story' ? this.stage : this.bossIndex % bosses.length + 1;
      if (pattern === 2 && e.phase >= 2) this.spawnEnemy('drone', e.x - 30, clamp(cy + Math.sin(e.age) * 150, 100, 600));
      if (pattern === 3 && e.phase === 3 && this.enemies.length < 4) this.spawnEnemy('turret', W - 80, e.age % 2 < 1 ? 110 : 585);
      if (pattern >= 4) {
        // Distinct late-game patterns: aimed lances, twin ports, corridor gates, then the core spiral.
        const ports = pattern === 5 ? [-85, 85] : pattern === 6 ? [-155, -70, 70, 155] : [0];
        for (const port of ports) {
          const angle = pattern === 6 ? Math.PI : pattern === 7 ? Math.PI + Math.sin(e.age * 2) * .8 : aim;
          this.bullets.push({ x: cx, y: cy + port, w: pattern === 4 ? 46 : 13, h: 10, vx: Math.cos(angle) * (pattern === 4 ? 380 : 245), vy: Math.sin(angle) * 245, power: 1, friendly: false, weapon: 'TWIN', life: 8, grazed: false, hits: [], pierce: false });
        }
      }
    }
  }
  damage() {
    if (this.invincible > 0 || this.dashTime > 0 || this.status !== 'playing') return;
    this.invincible = 1.5; this.shake = 10; this.combo = 0;
    if (this.barrier > 0) { this.barrier = 0; this.explosion(this.player.x, this.player.y, '#7cefff'); return; }
    this.hp--; this.stageDamage++; this.audio.play('explosion'); this.explosion(this.player.x + 25, this.player.y, '#ff758a', 30);
    if (this.hp <= 0) this.finish('over');
  }
  finish(status: 'over' | 'clear') {
    this.status = status;
    if (status === 'clear') {
      if (this.stageDamage === 0) this.score += 5000;
      if (!this.save.cleared.includes(this.stage)) this.save.cleared.push(this.stage);
      this.save.nextStage = Math.max(this.save.nextStage, Math.min(stages.length, this.stage + 1));
      if (this.stage === 1) this.unlock('B');
      if (this.stage === 3) this.unlock('C');
      if (this.stage === 4) this.unlock('E');
      if (this.stage === 5) this.recruit('noa');
      this.dialogue = { name: 'MISSION REPORT', text: this.data.clear };
      this.audio.play('clear');
    } else this.audio.play('over');
    this.save.highs[this.mode] = Math.max(this.save.highs[this.mode], Math.floor(this.score)); this.persist();
  }
  kill(e: Enemy) {
    this.kills++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboTime = 3.5;
    this.score += (e.kind === 'boss' ? 15000 : e.kind === 'midboss' ? 2500 : 120) * (1 + Math.min(this.combo, 100) * .04);
    this.hyper = Math.min(100, this.hyper + (e.kind === 'boss' ? 25 : 3));
    this.explosion(e.x + e.w / 2, e.y + e.h / 2, enemyData[e.kind].color, e.kind === 'boss' ? 100 : 20); this.audio.play('explosion');
    if (e.kind === 'boss') {
      this.bossKills++; this.bullets = this.bullets.filter(b => b.friendly); this.shake = 16;
      if (this.mode === 'story') {
        if (this.status === 'playing') this.finish('clear');
      } else if (this.status === 'playing') { this.bossIndex++; this.bossSpawned = false; this.audio.setTrack('attack'); this.hp = Math.min(this.ship.hp, this.hp + 1); this.bombs = Math.min(5, this.bombs + 1); }
    } else if (this.kills % 4 === 0 || e.kind === 'midboss') {
      const items: ItemKind[] = ['TWIN', 'SPREAD', 'LASER', 'HOMING', 'HEAL', 'BOMB', 'BARRIER', 'DRONE'];
      this.items.push({ x: e.x, y: e.y + e.h / 2, w: 30, h: 30, kind: items[Math.floor(Math.random() * items.length)] });
    }
  }
  update(dt: number, input: Input) {
    if (this.status !== 'playing') return;
    dt = Math.min(dt, .04); this.time += dt; this.stageTime += dt;
    this.score += dt * 8; this.slowing = input.slow && this.slow > 1;
    this.slow = clamp(this.slow + dt * (this.slowing ? -24 : 12), 0, 100);
    const worldDt = dt * (this.slowing ? .32 : 1);
    this.scroll += worldDt * this.data.speed;
    this.shot -= dt; this.dash = Math.max(0, this.dash - dt); this.dashTime -= dt; this.hyperTime -= dt; this.invincible -= dt; this.barrier -= dt;
    this.flash = Math.max(0, this.flash - dt); this.shake = Math.max(0, this.shake - dt * 25);
    this.comboTime -= dt; if (this.comboTime <= 0) this.combo = 0;
    this.dialogueTime -= dt; if (this.dialogueTime <= 0) this.dialogue = null;
    if (input.weapon) this.weapon = weaponOrder[(weaponOrder.indexOf(this.weapon) + 1) % 4];
    if (input.hyper && this.hyper >= 100) { this.hyper = 0; this.hyperTime = 8; this.audio.play('hyper'); this.say('LEO', 'HYPER DRIVE、起動！'); }
    if (input.dash && this.dash === 0) { this.dash = this.ship.dash; this.dashTime = .2; this.explosion(this.player.x, this.player.y + 14, this.ship.color); }
    if (input.bomb && this.bombs > 0) { this.bombs--; this.bullets = this.bullets.filter(b => b.friendly); for (const e of this.enemies) { e.shield = 0; e.hp -= e.kind === 'boss' ? 290 : 500; } this.flash = .35; this.shake = 18; this.invincible = 2; this.audio.play('bomb'); this.explosion(W / 2, H / 2, '#fff', 90); }
    const speed = this.ship.speed * (this.dashTime > 0 ? 3.2 : 1) * (this.hyperTime > 0 ? 1.1 : 1);
    let mx = input.moveX, my = input.moveY;
    if (input.target) {
      const dx = clamp(input.target.x + this.save.settings.touchOffset, 28, W - 28) - (this.player.x + 28);
      const dy = clamp(input.target.y - 20, 84, H - 44) - (this.player.y + 14);
      const dist = Math.hypot(dx, dy), divisor = Math.max(dist, speed * dt);
      mx = divisor ? dx / divisor : 0; my = divisor ? dy / divisor : 0;
    }
    this.player.x = clamp(this.player.x + mx * speed * dt, 8, W - this.player.w - 8);
    this.player.y = clamp(this.player.y + my * speed * dt, 70, H - this.player.h - 30);
    if ((input.shoot || this.save.settings.autoShot) && this.shot <= 0) {
      const power = this.ship.power * (this.ship.id === 'E' && this.weapon === 'LASER' ? 1.45 : 1);
      this.fire(this.player.x + 50, this.player.y + 14, this.weapon, this.levels[this.weapon], power);
      for (let i = 0; i < this.droneCount; i++) this.fire(this.player.x + 12, this.player.y + (i === 0 ? -30 : 58), 'TWIN', 1, .14);
      this.shot = weaponStats(this.weapon, this.levels[this.weapon]).interval;
      this.audio.play(this.weapon === 'LASER' ? 'laser' : this.weapon === 'HOMING' ? 'missile' : 'shot');
    }
    if (this.mode === 'story') {
      while (this.eventIndex < this.data.events.length && this.stageTime >= this.data.events[this.eventIndex].at) {
        const ev = this.data.events[this.eventIndex++];
        if (ev.kind === 'choice') { this.status = 'choice'; return; }
        if (ev.kind === 'wave') this.wave(ev.enemy ?? 'scout', ev.count ?? 4);
        if (ev.kind === 'midboss') this.spawnEnemy('midboss', W + 20, 240);
        if (ev.kind === 'dialogue') this.say('COMMAND', ev.text ?? '');
        if (ev.kind === 'obstacle') { const top = Math.floor(ev.at) % 2 === 0; this.obstacles.push({ x: W + 10, y: top ? 65 : 440, w: 100, h: 215 }); }
      }
      if (this.stageTime >= this.data.duration && !this.bossSpawned && this.warning <= 0) this.startWarning();
    } else if (this.time >= this.nextBoss && !this.bossSpawned && this.warning <= 0) {
      this.startWarning(); this.nextBoss = this.nextBoss === 180 ? 360 : this.nextBoss === 360 ? 600 : this.nextBoss + 300;
    }
    if (this.warning > 0) { this.warning -= dt; if (this.warning <= 0) { this.spawnEnemy('boss', W + 30, this.bossData === bosses[6] ? 200 : 230); this.bossSpawned = true; this.audio.play('boss'); this.audio.setTrack(this.bossData === bosses[6] ? 'final' : 'boss', this.stage); } }
    this.spawn -= worldDt;
    if (this.spawn <= 0 && !this.bossSpawned && this.warning <= 0) {
      const pool = this.mode === 'attack' ? stages[Math.min(stages.length - 1, Math.floor(this.time / 100))].pool : this.data.pool;
      this.spawnEnemy(pool[Math.floor(Math.random() * pool.length)]);
      this.spawn = Math.max(.42, (this.stage === 1 ? 2.1 : 1.6) / this.difficulty);
    }
    for (const e of [...this.enemies]) {
      e.age += worldDt; e.fire -= worldDt;
      if (e.kind === 'boss') {
        e.x = Math.max(W - e.w - 34, e.x - 120 * worldDt); e.y = e.baseY + Math.sin(e.age * .7) * 115;
        const phase = e.hp / e.maxHp > .7 ? 1 : e.hp / e.maxHp > .3 ? 2 : 3;
        if (phase !== e.phase) { e.phase = phase; this.audio.play('warning'); this.explosion(e.x + 100, e.y + e.h / 2, '#fff', 45); }
      } else {
        e.x -= enemyData[e.kind].speed * worldDt * Math.min(1.65, this.difficulty);
        if (e.kind === 'scout' || e.kind === 'drone' || e.kind === 'fast') e.y = e.baseY + Math.sin(e.age * 3) * 35;
        if (e.kind === 'rammer') e.y += clamp(this.player.y - e.y, -120, 120) * worldDt;
      }
      if (e.fire <= 0 && e.x < W - 20 && e.x > 20) { this.enemyFire(e); e.fire = enemyData[e.kind].interval / (1 + (e.phase - 1) * .3); }
    }
    for (const ally of this.allies) {
      ally.cooldown = Math.max(0, ally.cooldown - dt); ally.fire -= dt; ally.support -= dt;
      const i = this.allies.indexOf(ally);
      ally.x += (this.player.x - 58 - i * 22 - ally.x) * Math.min(1, dt * 5);
      ally.y += (clamp(this.player.y + (i % 2 ? 70 : -65), 80, H - 60) - ally.y) * Math.min(1, dt * 5);
      if (ally.cooldown > 0) continue;
      if (ally.fire <= 0 && this.enemies.length) { this.fire(ally.x + 25, ally.y, allyData[ally.id].weapon, 1, .35); ally.fire = .8; }
      if (ally.support <= 0) { if (ally.id === 'gale') this.barrier = Math.max(6, this.barrier); if (ally.id === 'noa') this.hp = Math.min(this.ship.hp, this.hp + 1); ally.support = 24; }
    }
    for (const b of this.bullets) {
      const step = b.friendly ? dt : worldDt;
      if (b.weapon === 'HOMING' && b.friendly && this.enemies.length) {
        let target = this.enemies[0], nearest = Infinity;
        for (const e of this.enemies) { const distance = Math.hypot(e.x - b.x, e.y + e.h / 2 - b.y); if (distance < nearest && e.hp > 0) { nearest = distance; target = e; } }
        const angle = Math.atan2(target.y + target.h / 2 - b.y, target.x + target.w / 2 - b.x);
        const turn = this.levels.HOMING >= 5 ? 7 : 4;
        b.vx += (Math.cos(angle) * 650 - b.vx) * Math.min(1, dt * turn); b.vy += (Math.sin(angle) * 650 - b.vy) * Math.min(1, dt * turn);
      }
      b.x += b.vx * step; b.y += b.vy * step; b.life -= step;
      if (b.friendly) {
        for (const e of this.enemies) {
          if (e.hp <= 0 || b.hits.includes(e.id) || !overlaps(b, e)) continue;
          if (e.shield > 0) e.shield = Math.max(0, e.shield - b.power); else e.hp -= b.power;
          b.hits.push(e.id); this.explosion(b.x, b.y, '#d7eeff', 2);
          if (!b.pierce || b.hits.length >= (b.weapon === 'LASER' && this.levels.LASER === 5 ? 4 : 2)) { b.life = 0; break; }
        }
      } else {
        const hitbox = { x: this.player.x + 19, y: this.player.y + 7, w: 18, h: 14 };
        if (overlaps(b, hitbox)) { this.damage(); b.life = 0; }
        else if (!b.grazed && Math.hypot(b.x - this.player.x - 28, b.y - this.player.y - 14) < 43) { b.grazed = true; this.score += 35; this.hyper = Math.min(100, this.hyper + .7); }
        for (const ally of this.allies) if (ally.cooldown <= 0 && Math.hypot(b.x - ally.x, b.y - ally.y) < 15) { ally.cooldown = 7; b.life = 0; this.explosion(ally.x, ally.y, allyData[ally.id].color); break; }
      }
    }
    // Process every defeated enemy, including bomb kills, through the same rewards/clear path.
    const defeated = this.enemies.filter(e => e.hp <= 0);
    this.enemies = this.enemies.filter(e => e.hp > 0 && e.x + e.w > -80);
    for (const e of defeated) this.kill(e);
    for (const e of this.enemies) if (overlaps({ x: this.player.x + 15, y: this.player.y + 5, w: 25, h: 18 }, e)) this.damage();
    for (const o of this.obstacles) { o.x -= this.data.speed * worldDt; if (overlaps(this.player, o)) this.damage(); }
    this.obstacles = this.obstacles.filter(o => o.x + o.w > 0);
    for (const item of this.items) {
      item.x -= worldDt * 105;
      if (!overlaps({ x: this.player.x - 15, y: this.player.y - 15, w: 86, h: 58 }, item)) continue;
      if (weaponOrder.includes(item.kind as Weapon)) { const w = item.kind as Weapon; this.levels[w] = Math.min(5, this.levels[w] + 1); this.weapon = w; }
      else if (item.kind === 'HEAL') this.hp = Math.min(this.ship.hp, this.hp + 1);
      else if (item.kind === 'BOMB') this.bombs = Math.min(5, this.bombs + 1);
      else if (item.kind === 'BARRIER') this.barrier = 12;
      else if (item.kind === 'DRONE') this.droneCount = Math.min(2, this.droneCount + 1);
      this.score += 300; item.x = -100; this.audio.play('item');
    }
    this.items = this.items.filter(i => i.x > -50);
    this.bullets = this.bullets.filter(b => b.life > 0 && b.x > -120 && b.x < W + 150 && b.y > -100 && b.y < H + 100).slice(-650);
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
    this.particles = this.particles.filter(p => p.life > 0);
  }
  startWarning() { this.warning = 3; this.enemies = []; this.bullets = this.bullets.filter(b => b.friendly); this.obstacles = []; this.audio.play('warning'); }
  snapshot(): Snapshot {
    const boss = this.enemies.find(e => e.kind === 'boss');
    return { status: this.status, mode: this.mode, stage: this.stage, title: this.data.name, score: Math.floor(this.score), time: this.time, hp: this.hp, maxHp: this.ship.hp, bombs: this.bombs, combo: this.combo, maxCombo: this.maxCombo, kills: this.kills, bosses: this.bossKills, weapon: this.weapon, level: this.levels[this.weapon], hyper: this.hyper, hyperTime: Math.max(0, this.hyperTime), slow: this.slow, dash: this.dash, allies: this.allies.map(a => `${allyData[a.id].name}${a.cooldown > 0 ? ' 帰還中' : ' ONLINE'}`).join(' / ') || 'SOLO FLIGHT', dialogue: this.dialogue, boss: boss ? { name: this.bossData.name, hp: Math.max(0, boss.hp / boss.maxHp), phase: boss.phase } : null, warning: this.warning > 0, tier: this.tier, barrier: this.barrier };
  }
}

