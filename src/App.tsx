import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_SIZE,
  PLAYER_SPEED,
  DASH_SPEED,
  BULLET_SPEED,
  ENEMY_BULLET_SPEED,
  ENEMY_SPAWN_RATE,
} from './types'
import type {
  WeaponType,
  EnemyType,
  ItemType,
  Bullet,
  Enemy,
  Item,
  Particle,
  Drone,
  Dialogue
} from './types'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('highScore')) || 0;
    } catch {
      return 0;
    }
  });
  const [hp, setHp] = useState(3);
  const [bombs, setBombs] = useState(2);
  const [combo, setCombo] = useState(0);
  const [activeWeapon, setActiveWeapon] = useState<WeaponType>('TWIN');
  const [weaponLevels, setWeaponLevels] = useState<Record<WeaponType, number>>({ TWIN: 1, SPREAD: 0, LASER: 0, HOMING: 0 });
  const [drones, setDrones] = useState<Drone[]>([]);
  const [slowGauge, setSlowGauge] = useState(100);
  const [hyperGauge, setHyperGauge] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  const [isHyper, setIsHyper] = useState(false);
  const [stage, setStage] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [hasBarrier, setHasBarrier] = useState(false);
  
  // 対話システム
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  // 会話中はフラグを立てて入力を制限するなどの制御用（Refで管理してループを壊さない）
  const isDialogueActive = useRef(false);
  const dialogueTimeoutRef = useRef<number | null>(null);

  const gameState = useRef({
    player: { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 120, width: PLAYER_SIZE, height: PLAYER_SIZE },
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    items: [] as Item[],
    particles: [] as Particle[],
    keys: {} as Record<string, boolean>,
    frameId: 0,
    lastShotTime: 0,
    barrierTimer: 0,
    frameCount: 0,
    screenShake: 0,
    comboTimer: 0,
    bossSpawned: false,
    dashCooldown: 0,
    dashActive: 0,
    slowActive: false,
    hyperActive: false,
    flashTimer: 0,
    invincibleTimer: 0,
    playerTilt: 0,
  });

  const hyperTimeoutRef = useRef<number | null>(null);

  const showDialogue = useCallback((portrait: Dialogue['portrait'], name: string, text: string, duration = 3000) => {
    if (dialogueTimeoutRef.current !== null) {
      window.clearTimeout(dialogueTimeoutRef.current);
    }
    setDialogue({ portrait, name, text });
    isDialogueActive.current = true;
    dialogueTimeoutRef.current = window.setTimeout(() => {
      setDialogue(null);
      isDialogueActive.current = false;
      dialogueTimeoutRef.current = null;
    }, duration);
  }, []);

  useEffect(() => () => {
    if (dialogueTimeoutRef.current !== null) {
      window.clearTimeout(dialogueTimeoutRef.current);
    }
    if (hyperTimeoutRef.current !== null) {
      window.clearTimeout(hyperTimeoutRef.current);
    }
  }, []);

  const createExplosion = useCallback((x: number, y: number, color: string, count = 10, size = 4) => {
    for (let i = 0; i < count; i++) {
      gameState.current.particles.push({
        x, y, vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 0.5) * 15, life: 1, color, size: Math.random() * size + 2
      });
    }
  }, []);

  const startGame = () => {
    if (hyperTimeoutRef.current !== null) {
      window.clearTimeout(hyperTimeoutRef.current);
      hyperTimeoutRef.current = null;
    }
    setScore(0); setHp(3); setBombs(2); setCombo(0); setDrones([]); setSlowGauge(100); setHyperGauge(0); setStage(1);
    setActiveWeapon('TWIN'); setWeaponLevels({ TWIN: 1, SPREAD: 0, LASER: 0, HOMING: 0 });
    setHasBarrier(false); setGameOver(false); setGameStarted(true); setIsHyper(false);
    const state = gameState.current;
    state.player = { x: CANVAS_WIDTH / 2 - PLAYER_SIZE / 2, y: CANVAS_HEIGHT - 120, width: PLAYER_SIZE, height: PLAYER_SIZE };
    state.bullets = []; state.enemies = []; state.items = []; state.particles = []; state.bossSpawned = false;
    state.keys = {}; state.lastShotTime = 0; state.barrierTimer = 0; state.frameCount = 0;
    state.screenShake = 0; state.comboTimer = 0; state.dashCooldown = 0; state.dashActive = 0;
    state.invincibleTimer = 0; state.flashTimer = 0; state.playerTilt = 0;
    state.slowActive = false; state.hyperActive = false; setIsSlow(false);

    showDialogue('COMMANDER', '司令官', 'ジェミニ1号、発進せよ！銀河の平和は君にかかっている。');
  };

  const activateBomb = useCallback(() => {
    if (bombs <= 0 || !gameStarted || gameOver) return;

    setBombs(b => Math.max(0, b - 1));
    const state = gameState.current;
    state.screenShake = 50;
    state.flashTimer = 20;
    state.invincibleTimer = 120;

    createExplosion(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#ffffff', 150, 40);

    state.enemies.forEach(e => {
      if (e.type === 'BOSS') {
        e.hp -= 150;
        createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#ff0000', 50, 15);
      } else {
        e.hp = 0;
      }
    });

    state.bullets = state.bullets.filter(b => b.isPlayer);
    showDialogue('PILOT', 'レオ', 'フルバースト！全目標を排除する！', 1500);
  }, [bombs, gameStarted, gameOver, createExplosion, showDialogue]);

  const activateHyper = useCallback(() => {
    if (hyperGauge < 100 || !gameStarted || gameOver) return;

    if (hyperTimeoutRef.current !== null) {
      window.clearTimeout(hyperTimeoutRef.current);
    }
    setHyperGauge(0);
    setIsHyper(true);
    gameState.current.hyperActive = true;
    gameState.current.screenShake = 15;
    showDialogue('PILOT', 'レオ', 'ハイパーモード、起動！限界突破だ！', 2000);
    hyperTimeoutRef.current = window.setTimeout(() => {
      setIsHyper(false);
      gameState.current.hyperActive = false;
      hyperTimeoutRef.current = null;
    }, 8000);
  }, [hyperGauge, gameStarted, gameOver, showDialogue]);

  const setVirtualKey = useCallback((key: string, pressed: boolean) => {
    gameState.current.keys[key] = pressed;
  }, []);

  const triggerDash = useCallback(() => {
    if (!gameStarted || gameOver || gameState.current.dashCooldown > 0) return;
    gameState.current.dashActive = 15;
    gameState.current.dashCooldown = 60;
    createExplosion(gameState.current.player.x + PLAYER_SIZE / 2, gameState.current.player.y + PLAYER_SIZE, '#ffffff', 10, 3);
  }, [gameStarted, gameOver, createExplosion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift'].includes(e.key)) {
        e.preventDefault();
      }
      gameState.current.keys[e.key] = true;
      if (e.key === 'x' || e.key === 'X') activateBomb();
      if (e.key === 'c' || e.key === 'C') activateHyper();
      if (e.key === 'Shift') triggerDash();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      gameState.current.keys[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [activateBomb, activateHyper, triggerDash]);

  useEffect(() => {
    if (score > highScore) { 
      setHighScore(score); 
      try {
        localStorage.setItem('highScore', score.toString()); 
      } catch {
        // Ignore storage errors
      }
    }
    const nextStage = Math.floor(score / 30000) + 1;
    if (nextStage !== stage) {
      setStage(nextStage);
      showDialogue('COMMANDER', '司令官', `ステージ${nextStage}に突入した。敵の反応が強まっている、警戒せよ！`);
    }
  }, [score, highScore, stage, showDialogue]);

  useEffect(() => {
    if (!gameStarted || gameOver) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;

    const update = () => {
      const state = gameState.current;
      const now = Date.now();
      const timeFactor = state.slowActive ? 0.3 : 1.0;
      const hyperFactor = state.hyperActive ? 1.5 : 1.0;
      state.frameCount++;

      if (hasBarrier && state.barrierTimer > 0 && now >= state.barrierTimer) {
        state.barrierTimer = 0;
        setHasBarrier(false);
        showDialogue('PILOT', 'レオ', 'バリアのエネルギーが切れた。', 1200);
      }

      const isZPressed = state.keys['z'] || state.keys['Z'];
      if (isZPressed) {
        setSlowGauge(g => {
          if (g > 10 || state.slowActive) {
            state.slowActive = true; setIsSlow(true);
            const next = g - 0.6;
            if (next <= 0) { state.slowActive = false; setIsSlow(false); return 0; }
            return next;
          }
          state.slowActive = false; setIsSlow(false);
          return g;
        });
      } else {
        state.slowActive = false; setIsSlow(false);
        setSlowGauge(g => Math.min(100, g + 0.15));
      }

      if (state.comboTimer > 0) {
        state.comboTimer--;
        if (state.comboTimer === 0) setCombo(0);
      }

      // 1. 自機の移動 & ティルトアニメーション
      let currentSpeed = PLAYER_SPEED * hyperFactor;
      if (state.dashActive > 0) { currentSpeed = DASH_SPEED; state.dashActive--; }
      if (state.dashCooldown > 0) state.dashCooldown--;

      const moveLeft = state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A'];
      const moveRight = state.keys['ArrowRight'] || state.keys['d'] || state.keys['D'];
      const moveUp = state.keys['ArrowUp'] || state.keys['w'] || state.keys['W'];
      const moveDown = state.keys['ArrowDown'] || state.keys['s'] || state.keys['S'];

      if (moveLeft && state.player.x > 0) {
        state.player.x -= currentSpeed;
        state.playerTilt = Math.max(-0.4, state.playerTilt - 0.05);
      } else if (moveRight && state.player.x < CANVAS_WIDTH - PLAYER_SIZE) {
        state.player.x += currentSpeed;
        state.playerTilt = Math.min(0.4, state.playerTilt + 0.05);
      } else {
        state.playerTilt *= 0.8;
      }
      if (moveUp && state.player.y > 0) state.player.y -= currentSpeed;
      if (moveDown && state.player.y < CANVAS_HEIGHT - PLAYER_SIZE) state.player.y += currentSpeed;

      // 2. 武器システム
      const currentLevel = weaponLevels[activeWeapon];
      const totalLevel = Object.values(weaponLevels).reduce((a, b) => a + b, 0);
      const shotInterval = Math.max(state.hyperActive ? 30 : 60, (160 - totalLevel * 8) / hyperFactor);
      
      if (state.keys[' '] && now - state.lastShotTime > shotInterval) {
        const fire = (x: number, y: number) => {
          if (activeWeapon === 'TWIN') {
            const count = 1 + Math.floor(currentLevel / 2);
            for (let i = 0; i < count; i++) {
              const offsetX = (i - (count - 1) / 2) * 24;
              state.bullets.push({ x: x - 4 + offsetX - 15, y: y, width: 8, height: 20, type: 'TWIN', vx: 0, vy: -BULLET_SPEED, power: 1 + currentLevel * 0.4, isPlayer: true });
              state.bullets.push({ x: x - 4 + offsetX + 15, y: y, width: 8, height: 20, type: 'TWIN', vx: 0, vy: -BULLET_SPEED, power: 1 + currentLevel * 0.4, isPlayer: true });
            }
          } else if (activeWeapon === 'SPREAD') {
            const count = 3 + currentLevel * 2;
            for (let i = 0; i < count; i++) {
              const angle = (i - (count - 1) / 2) * (0.12 + currentLevel * 0.03);
              state.bullets.push({ x: x - 5, y: y, width: 10, height: 10, type: 'SPREAD', vx: Math.sin(angle) * BULLET_SPEED, vy: -Math.cos(angle) * BULLET_SPEED, power: 1 + currentLevel * 0.5, isPlayer: true });
            }
          } else if (activeWeapon === 'LASER') {
            const laserWidth = 8 + currentLevel * 5;
            state.bullets.push({ x: x - laserWidth / 2, y: y - 40, width: laserWidth, height: 80, type: 'LASER', vx: 0, vy: -BULLET_SPEED * 2.2, power: 1 + currentLevel * 1, isPlayer: true });
          } else if (activeWeapon === 'HOMING') {
            const count = 2 + Math.floor(currentLevel / 2);
            for (let i = 0; i < count; i++) {
              const angle = (i - (count - 1) / 2) * 0.5 - Math.PI / 2;
              state.bullets.push({ x: x - 5, y: y, width: 12, height: 12, type: 'HOMING', vx: Math.cos(angle) * 5, vy: Math.sin(angle) * 5, power: 1.5 + currentLevel * 0.6, isPlayer: true });
            }
          }
        };
        fire(state.player.x + PLAYER_SIZE / 2, state.player.y);
        drones.forEach(d => fire(state.player.x + PLAYER_SIZE / 2 + d.offsetX, state.player.y + PLAYER_SIZE / 2 + d.offsetY));
        state.lastShotTime = now;
      }

      // 3. 弾の移動
      state.bullets = state.bullets.filter(b => {
        const factor = b.isPlayer ? 1.0 : timeFactor;
        
        if (b.type === 'HOMING' && b.isPlayer) {
          let target = state.enemies[0];
          let minDist = 1000000;
          state.enemies.forEach(e => {
            const d = Math.pow(e.x - b.x, 2) + Math.pow(e.y - b.y, 2);
            if (d < minDist) { minDist = d; target = e; }
          });
          if (target) {
            const angle = Math.atan2(target.y + target.height/2 - b.y, target.x + target.width/2 - b.x);
            b.vx += Math.cos(angle) * 0.8;
            b.vy += Math.sin(angle) * 0.8;
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed > BULLET_SPEED) { b.vx = (b.vx / speed) * BULLET_SPEED; b.vy = (b.vy / speed) * BULLET_SPEED; }
          }
        }

        b.x += b.vx * factor; b.y += b.vy * factor;
        return b.y > -100 && b.y < CANVAS_HEIGHT + 100 && b.x > -100 && b.x < CANVAS_WIDTH + 100;
      });

      // 4. 敵の生成
      const isBossAlive = state.enemies.some(e => e.type === 'BOSS');
      if (score > 0 && score % 30000 < 500 && !state.bossSpawned && !isBossAlive) {
        state.enemies.push({ x: CANVAS_WIDTH / 2 - 120, y: -250, width: 240, height: 180, type: 'BOSS', hp: 200 + stage * 100, maxHp: 200 + stage * 100, speed: 0.5, color: '#ff0000', rotation: 0, lastFireTime: 0, eyeY: 0 });
        state.bossSpawned = true;
        showDialogue('BOSS', '超銀河要塞', 'フハハハ！ここが貴様の墓場となるのだ！');
      }

      if (Math.random() < (isBossAlive ? 0.005 : ENEMY_SPAWN_RATE)) {
        const rand = Math.random();
        if (rand < 0.1 && !isBossAlive) {
          // 編隊生成
          const count = 5;
          const startX = Math.random() * (CANVAS_WIDTH - 200) + 100;
          for (let i = 0; i < count; i++) {
            state.enemies.push({ x: startX, y: -i * 60 - 50, width: 45, height: 45, type: 'SCOUT', hp: 1, maxHp: 1, speed: 4, color: '#00ffaa', rotation: 0, lastFireTime: 0, eyeY: 0 });
          }
        } else {
          let type: EnemyType = 'SCOUT';
          let hp = 1, speed = 4, color = '#00ffaa', width = 45, height = 45;
          let shield = 0;
          if (rand > 0.93) { type = 'MOTHER'; hp = 25 + totalLevel * 4; speed = 1.0; color = '#ff00ff'; width = 100; height = 80; }
          else if (rand > 0.85) { type = 'DEFENDER'; hp = 10 + totalLevel * 2; speed = 2.0; color = '#00ccff'; width = 60; height = 60; shield = 15; }
          else if (rand > 0.70) { type = 'STRIKER'; hp = 6 + totalLevel; speed = 3.5; color = '#ff4444'; width = 55; height = 55; }
          state.enemies.push({ x: Math.random() * (CANVAS_WIDTH - width), y: -height, width, height, type, hp, maxHp: hp, speed, color, rotation: 0, lastFireTime: 0, eyeY: 0, shield });
        }
      }
      if (score % 30000 > 2000) state.bossSpawned = false;

      // 5. 敵の移動 & 攻撃
      state.enemies = state.enemies.filter(e => {
        e.eyeY = Math.sin(state.frameCount * 0.1) * 3;
        if (e.type === 'BOSS') {
          if (e.y < 100) e.y += 2 * timeFactor;
          else {
            e.x += Math.sin(state.frameCount * 0.02 * timeFactor) * 4;
            if (now - e.lastFireTime > (e.hp < e.maxHp / 2 ? 600 : 1200)) {
              const bulletCount = e.hp < e.maxHp / 2 ? 16 : 10;
              for (let i = 0; i < bulletCount; i++) {
                const angle = (i / bulletCount) * Math.PI * 2 + state.frameCount * 0.04;
                state.bullets.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, width: 14, height: 14, type: 'TWIN', vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED, power: 1, isPlayer: false });
              }
              e.lastFireTime = now;
            }
          }
        } else if (e.type === 'DEFENDER') {
            e.y += e.speed * timeFactor;
            if (now - e.lastFireTime > 2000) {
                const bulletCount = 3;
                for (let i = 0; i < bulletCount; i++) {
                    const angle = Math.PI/2 + (i - 1) * 0.3;
                    state.bullets.push({ x: e.x + e.width / 2, y: e.y + e.height, width: 12, height: 12, type: 'TWIN', vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED, power: 1, isPlayer: false });
                }
                e.lastFireTime = now;
            }
        } else {
          e.y += e.speed * timeFactor;
          if (e.type === 'SCOUT') e.x += Math.sin(state.frameCount * 0.05 * timeFactor) * 4;
          if (now - e.lastFireTime > 1800 && Math.random() < 0.015) {
            const angle = Math.atan2(state.player.y - e.y, state.player.x - e.x);
            state.bullets.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, width: 10, height: 10, type: 'TWIN', vx: Math.cos(angle) * ENEMY_BULLET_SPEED, vy: Math.sin(angle) * ENEMY_BULLET_SPEED, power: 1, isPlayer: false });
            e.lastFireTime = now;
          }
        }
        e.rotation += 0.02 * timeFactor;
        return e.y < CANVAS_HEIGHT + 150;
      });

      // 6. パーティクル
      state.particles.forEach(p => { p.x += p.vx * timeFactor; p.y += p.vy * timeFactor; p.life -= 0.02; });
      state.particles = state.particles.filter(p => p.life > 0);

      // 7. アイテム
      state.items = state.items.filter(item => {
        item.y += item.speed * timeFactor; item.pulse = Math.sin(state.frameCount * 0.1) * 8;
        if (state.player.x < item.x + item.width && state.player.x + state.player.width > item.x &&
            state.player.y < item.y + item.height && state.player.y + state.player.height > item.y) {
          if (item.type.startsWith('W_')) {
            const type = item.type.split('_')[1] as WeaponType;
            setWeaponLevels(prev => ({ ...prev, [type]: prev[type] + 1 })); setActiveWeapon(type);
            showDialogue('PILOT', 'レオ', `${type}兵装、強化完了！`, 1000);
          }
          if (item.type === 'BARRIER') { setHasBarrier(true); state.barrierTimer = now + 12000; showDialogue('PILOT', 'レオ', 'バリア展開！', 1000); }
          if (item.type === 'HEAL') { setHp(h => Math.min(5, h + 1)); showDialogue('PILOT', 'レオ', '機体修復完了。助かった。', 1000); }
          if (item.type === 'BOMB') { setBombs(b => Math.min(5, b + 1)); }
          if (item.type === 'DRONE') {
            if (drones.length === 0) setDrones([{ offsetX: -70, offsetY: 20 }]);
            else if (drones.length === 1) setDrones([{ offsetX: -70, offsetY: 20 }, { offsetX: 70, offsetY: 20 }]);
            showDialogue('PILOT', 'レオ', 'サポートドローン、接続！', 1000);
          }
          setScore(s => s + 500); createExplosion(item.x + item.width/2, item.y + item.height/2, '#ffffff', 20, 4);
          return false;
        }
        return item.y < CANVAS_HEIGHT;
      });

      // 8. 衝突判定 (プレイヤー弾 vs 敵)
      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const b = state.bullets[i]; if (!b.isPlayer) continue;
        for (let j = state.enemies.length - 1; j >= 0; j--) {
          const e = state.enemies[j];
          if (b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
            if (b.type !== 'LASER') state.bullets.splice(i, 1);
            
            if (e.shield && e.shield > 0) {
              e.shield -= b.power;
              createExplosion(b.x, b.y, '#00ffff', 4, 2);
            } else {
              e.hp -= b.power;
              createExplosion(b.x, b.y, '#ffff00', 4, 2);
            }

            if (e.hp <= 0) {
              const isBoss = e.type === 'BOSS';
              createExplosion(e.x + e.width / 2, e.y + e.height / 2, isBoss ? '#ff0000' : e.color, isBoss ? 150 : 30, isBoss ? 10 : 6);
              state.screenShake = isBoss ? 60 : 6; state.enemies.splice(j, 1);
              setCombo(c => c + 1); state.comboTimer = 120;
              setHyperGauge(g => Math.min(100, g + (isBoss ? 50 : 2)));
              setScore(s => s + (isBoss ? 20000 : 500) + Math.floor(200 * (1 + (combo * 0.1))));
              if (isBoss) showDialogue('COMMANDER', '司令官', '目標の沈黙を確認。見事だ、レオ！');
              if (Math.random() < 0.3 || isBoss) {
                const types: ItemType[] = ['W_TWIN', 'W_SPREAD', 'W_LASER', 'W_HOMING', 'BARRIER', 'HEAL', 'BOMB', 'DRONE'];
                state.items.push({ x: e.x + e.width/2 - 20, y: e.y + e.height/2 - 20, width: 45, height: 45, type: types[Math.floor(Math.random() * types.length)], speed: 1.2, pulse: 0 });
              }
            }
            break;
          }
        }
      }

      // 9. 衝突判定 (敵 vs 自機)
      const damagePlayer = (message = true) => {
        createExplosion(state.player.x + PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2, '#ff0000', 40, 10);
        state.screenShake = 25;
        state.invincibleTimer = 60;
        if (hasBarrier) {
          state.barrierTimer = 0;
          setHasBarrier(false);
          if (message) showDialogue('PILOT', 'レオ', 'シールド消失！まずいな。', 1500);
          return;
        }
        setHp(h => {
          const nextHp = Math.max(0, h - 1);
          if (nextHp === 0) {
            setGameOver(true);
            showDialogue('COMMANDER', '司令官', 'レオ！応答しろ、レオ！！');
          }
          return nextHp;
        });
      };

      if (state.dashActive <= 0 && state.invincibleTimer <= 0) {
        for (let i = state.bullets.length - 1; i >= 0; i--) {
          const b = state.bullets[i]; if (b.isPlayer) continue;
          if (b.x < state.player.x + PLAYER_SIZE && b.x + b.width > state.player.x && b.y < state.player.y + PLAYER_SIZE && b.y + b.height > state.player.y) {
            state.bullets.splice(i, 1);
            damagePlayer();
            break;
          }
        }

        if (state.invincibleTimer <= 0) {
          for (let i = state.enemies.length - 1; i >= 0; i--) {
            const e = state.enemies[i];
            if (state.player.x < e.x + e.width && state.player.x + state.player.width > e.x && state.player.y < e.y + e.height && state.player.y + state.player.height > e.y) {
              if (e.type !== 'BOSS') state.enemies.splice(i, 1);
              damagePlayer(false);
              break;
            }
          }
        }
      }

      if (state.invincibleTimer > 0) state.invincibleTimer--;

      // --- 描画 ---
      if (state.screenShake > 0) {
        const dx = (Math.random() - 0.5) * state.screenShake; const dy = (Math.random() - 0.5) * state.screenShake;
        ctx.setTransform(1, 0, 0, 1, dx, dy); state.screenShake *= 0.92; if (state.screenShake < 0.5) state.screenShake = 0;
      } else { ctx.setTransform(1, 0, 0, 1, 0, 0); }

      ctx.clearRect(-100, -100, CANVAS_WIDTH + 200, CANVAS_HEIGHT + 200);
      const bgColors = ['#000011', '#110000', '#001100', '#111100'];
      ctx.fillStyle = bgColors[(stage - 1) % bgColors.length]; ctx.fillRect(-100, -100, CANVAS_WIDTH + 200, CANVAS_HEIGHT + 200);

      // 背景の星 (パララックス & ハイパー効果)
      const starSpeeds = [0.5, 1.5, 4];
      const starCounts = [50, 30, 15];
      const starColors = ['#444', '#888', '#fff'];
      for (let layer = 0; layer < 3; layer++) {
          ctx.fillStyle = starColors[layer];
          const speed = starSpeeds[layer] * timeFactor * (state.hyperActive ? 4 : 1);
          for (let i = 0; i < starCounts[layer]; i++) {
              const x = (i * 213 + layer * 77) % CANVAS_WIDTH;
              const y = (state.frameCount * speed + i * 137) % CANVAS_HEIGHT;
              const size = layer + 1;
              if (state.hyperActive) {
                  ctx.globalAlpha = 0.6;
                  ctx.fillRect(x, y, size, size * 10); // 流れる星
              } else {
                  ctx.globalAlpha = 0.4 + layer * 0.2;
                  ctx.fillRect(x, y, size, size);
              }
          }
      }
      ctx.globalAlpha = 1;

      // パーティクル
      for (const p of state.particles) { ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;

      // アイテム
      for (const item of state.items) {
        ctx.save(); ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
        const color = item.type === 'W_TWIN' ? '#00ffff' : item.type === 'W_SPREAD' ? '#aaff00' : item.type === 'W_LASER' ? '#ff0044' : item.type === 'BARRIER' ? '#0088ff' : item.type === 'HEAL' ? '#ff00ff' : item.type === 'BOMB' ? '#ffaa00' : '#ffffff';
        const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 25 + item.pulse); grad.addColorStop(0, color); grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.arc(0, 0, 25 + item.pulse, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.shadowBlur = 15; ctx.shadowColor = color;
        if (item.type === 'DRONE') { ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); }
        else if (item.type === 'HEAL') { ctx.fillRect(-15, -4, 30, 8); ctx.fillRect(-4, -15, 8, 30); }
        else { ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText(item.type === 'BOMB' ? 'B' : item.type.split('_')[1]?.[0] || 'D', 0, 8); }
        ctx.restore();
      }

      // 敵キャラクター (詳細版)
      for (const e of state.enemies) {
        ctx.save(); ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
        if (e.type === 'BOSS') {
          ctx.fillStyle = '#330000'; ctx.beginPath(); ctx.moveTo(-110, -60); ctx.lineTo(110, -60); ctx.lineTo(90, 85); ctx.lineTo(-90, 85); ctx.closePath(); ctx.fill();
          ctx.fillStyle = (e.hp < e.maxHp / 2) ? '#ff0000' : '#880000'; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.shadowBlur = 10; ctx.shadowColor = '#fff';
          ctx.fillRect(-60, -25 + e.eyeY, 30, 12); ctx.fillRect(30, -25 + e.eyeY, 30, 12); ctx.shadowBlur = 0;
          ctx.strokeStyle = '#444'; ctx.lineWidth = 4; ctx.strokeRect(-110, -60, 220, 145);
        } else {
          ctx.rotate(e.rotation); ctx.fillStyle = e.color;
          if (e.type === 'SCOUT') {
            ctx.beginPath(); for(let i=0; i<6; i++) ctx.lineTo(Math.cos(i*Math.PI/3)*22, Math.sin(i*Math.PI/3)*22); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(-8, -8 + e.eyeY, 16, 4);
          } else if (e.type === 'STRIKER') {
            ctx.fillRect(-30, -8, 60, 16); ctx.fillRect(-8, -30, 8, 60);
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, e.eyeY, 6, 0, Math.PI * 2); ctx.fill();
          } else if (e.type === 'MOTHER') {
            ctx.beginPath(); ctx.ellipse(0, 0, 55, 45, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ff00ff'; ctx.beginPath(); ctx.arc(0, e.eyeY, 10, 0, Math.PI * 2); ctx.fill();
          } else if (e.type === 'DEFENDER') {
            ctx.fillStyle = '#555'; ctx.fillRect(-30, -30, 60, 60);
            ctx.fillStyle = '#00ccff'; ctx.beginPath(); ctx.moveTo(-35, -35); ctx.lineTo(35, -35); ctx.lineTo(25, 35); ctx.lineTo(-25, 35); ctx.closePath(); ctx.fill();
            if (e.shield && e.shield > 0) {
              ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.stroke();
            }
          }
        }
        ctx.restore();
        if (e.type !== 'SCOUT') { ctx.fillStyle = '#222'; ctx.fillRect(e.x, e.y - 20, e.width, 8); ctx.fillStyle = e.type === 'BOSS' ? '#ff0000' : '#00ff00'; ctx.fillRect(e.x, e.y - 20, e.width * (e.hp / e.maxHp), 8); }
      }

      // 自機 & ドローン (詳細版)
      const drawCharacter = (x: number, y: number, size: number, isMain: boolean, tilt: number) => {
        if (isMain && state.invincibleTimer > 0 && state.frameCount % 10 < 5) return; // 点滅
        ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
        if (isMain && hasBarrier) { ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'; ctx.fill(); }
        if (isMain && state.dashActive > 0) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 55, 0, Math.PI * 2); ctx.stroke(); }
        if (isMain && state.hyperActive) {
            ctx.shadowBlur = 20; ctx.shadowColor = '#ffaa00';
            ctx.strokeStyle = '#ffaa00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 60 + Math.sin(state.frameCount * 0.2) * 5, 0, Math.PI * 2); ctx.stroke();
        }
        // 機体
        ctx.fillStyle = isMain ? (state.hyperActive ? '#ffaa00' : '#4488ff') : '#999';
        ctx.beginPath(); ctx.moveTo(0, -size / 2); ctx.lineTo(-size / 2, size / 3); ctx.lineTo(0, size / 5); ctx.lineTo(size / 2, size / 3); ctx.closePath(); ctx.fill();
        // コックピット・顔
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -size / 6, size / 8, 0, Math.PI * 2); ctx.fill();
        if (isMain) { ctx.fillStyle = '#000'; ctx.fillRect(-3, -size/6 - 2, 2, 4); ctx.fillRect(1, -size/6 - 2, 2, 4); }
        // ウィング
        ctx.fillStyle = isMain ? (state.hyperActive ? '#cc4400' : '#0044cc') : '#666'; ctx.fillRect(-size/2 - 5, 0, 10, size/3); ctx.fillRect(size/2 - 5, 0, 10, size/3);
        // エンジン
        if (state.frameCount % 4 < 2) { ctx.fillStyle = '#ffaa00'; ctx.beginPath(); ctx.moveTo(-size/4, size/3); ctx.lineTo(0, size/2 + (state.hyperActive ? 30 : 15)); ctx.lineTo(size/4, size/3); ctx.fill(); }
        ctx.restore(); ctx.shadowBlur = 0;
      };
      drawCharacter(state.player.x + PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2, PLAYER_SIZE, true, state.playerTilt);
      drones.forEach(d => drawCharacter(state.player.x + PLAYER_SIZE / 2 + d.offsetX, state.player.y + PLAYER_SIZE / 2 + d.offsetY, 25, false, state.playerTilt * 0.5));

      // 弾
      for (const b of state.bullets) {
        ctx.fillStyle = b.isPlayer ? (b.type === 'LASER' ? '#ff0044' : b.type === 'SPREAD' ? '#aaff00' : b.type === 'HOMING' ? '#ff00ff' : '#00ffff') : '#ffcc00';
        ctx.shadowBlur = 10; ctx.shadowColor = ctx.fillStyle as string;
        if (!b.isPlayer) { ctx.beginPath(); ctx.arc(b.x, b.y, b.width / 2, 0, Math.PI * 2); ctx.fill(); }
        else if (b.type === 'HOMING') {
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
            ctx.fillRect(-b.width/2, -b.height/2, b.width, b.height);
            ctx.fillStyle = '#fff'; ctx.fillRect(b.width/4, -b.height/4, b.width/4, b.height/2);
            ctx.restore();
        }
        else ctx.fillRect(b.x, b.y, b.width, b.height);
        ctx.shadowBlur = 0;
      }

      // フラッシュエフェクト
      if (state.flashTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${state.flashTimer / 20})`;
        ctx.fillRect(-100, -100, CANVAS_WIDTH + 200, CANVAS_HEIGHT + 200);
        state.flashTimer--;
      }

      state.frameId = requestAnimationFrame(update);
    };
    const stateForCleanup = gameState.current;
    stateForCleanup.frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(stateForCleanup.frameId);
  }, [gameStarted, gameOver, hasBarrier, activeWeapon, weaponLevels, combo, drones, stage, hyperGauge, score, createExplosion, showDialogue]);

  return (
    <div className="game-container">
      <div className={`game-wrapper ${isSlow ? 'slow-mo' : ''} ${isHyper ? 'hyper-mode' : ''}`}>
        <div className="ui">
          <div className="stats-main">
            <div className="score-row">
              <div className="score">SCORE: {score.toLocaleString()}</div>
              <div className="highscore">HI: {highScore.toLocaleString()}</div>
            </div>
            <div className="hp-row">HP: {'❤️'.repeat(hp)}</div>
            <div className="bomb-row">BOMB(X): {'💣'.repeat(bombs)}</div>
            <div className="slow-row">
              <span className="label">SLOW(Z):</span>
              <div className="gauge-bg"><div className="gauge-fill" style={{ width: `${slowGauge}%` }}></div></div>
            </div>
            <div className="hyper-row">
              <span className="label">HYPER(C):</span>
              <div className="gauge-bg"><div className="gauge-fill hyper" style={{ width: `${hyperGauge}%` }}></div></div>
            </div>
            {combo > 1 && <div className="combo-display">{combo} COMBO!!</div>}
          </div>
          <div className="stats-side">
            <div className="stage-display">STAGE {stage}</div>
            <div className="weapon-stats">
              <div className={activeWeapon === 'TWIN' ? 'active' : ''}>TWIN: Lv.{weaponLevels.TWIN}</div>
              <div className={activeWeapon === 'SPREAD' ? 'active' : ''}>SPREAD: Lv.{weaponLevels.SPREAD}</div>
              <div className={activeWeapon === 'LASER' ? 'active' : ''}>LASER: Lv.{weaponLevels.LASER}</div>
              <div className={activeWeapon === 'HOMING' ? 'active' : ''}>HOMING: Lv.{weaponLevels.HOMING}</div>
              <div className="drone-count">DRONES: {drones.length}</div>
            </div>
          </div>
        </div>

        {dialogue && (
          <div className={`dialogue-box ${dialogue.portrait.toLowerCase()}`}>
            <div className="portrait">
              {dialogue.portrait === 'PILOT' && <div className="pilot-icon">👨‍🚀</div>}
              {dialogue.portrait === 'COMMANDER' && <div className="commander-icon">👮</div>}
              {dialogue.portrait === 'BOSS' && <div className="boss-icon">👺</div>}
            </div>
            <div className="content">
              <div className="name">{dialogue.name}</div>
              <div className="text">{dialogue.text}</div>
            </div>
          </div>
        )}

        {!gameStarted && (
          <div className="overlay">
            <h1>NEO DEFENDER: HYPER EDITION</h1>
            <p>矢印: 移動 / スペース: 射撃</p>
            <div className="feature-list">
              <li>🎭 キャラクター同士の通信イベント</li>
              <li>🚀 機体が傾く！表情豊かなアニメーション</li>
              <li>⚔️ 新兵装：追尾ミサイル＆ハイパーモード(C)</li>
              <li>🛡️ 盾持ちの強敵「ディフェンダー」出現</li>
              <li>⏳ バレットタイムで極限回避(Z)</li>
            </div>
            <button onClick={startGame}>MISSION START</button>
          </div>
        )}
        {gameOver && (
          <div className="overlay">
            <h1>MISSION FAILED</h1>
            <p>Score: {score.toLocaleString()}</p>
            <button onClick={startGame}>RETRY</button>
          </div>
        )}
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="game-canvas" />

        {gameStarted && !gameOver && (
          <div className="touch-controls" aria-label="タッチ操作">
            <div className="touch-dpad">
              <button className="touch-btn up" aria-label="上" onPointerDown={() => setVirtualKey('ArrowUp', true)} onPointerUp={() => setVirtualKey('ArrowUp', false)} onPointerCancel={() => setVirtualKey('ArrowUp', false)} onPointerLeave={() => setVirtualKey('ArrowUp', false)}>▲</button>
              <button className="touch-btn left" aria-label="左" onPointerDown={() => setVirtualKey('ArrowLeft', true)} onPointerUp={() => setVirtualKey('ArrowLeft', false)} onPointerCancel={() => setVirtualKey('ArrowLeft', false)} onPointerLeave={() => setVirtualKey('ArrowLeft', false)}>◀</button>
              <button className="touch-btn down" aria-label="下" onPointerDown={() => setVirtualKey('ArrowDown', true)} onPointerUp={() => setVirtualKey('ArrowDown', false)} onPointerCancel={() => setVirtualKey('ArrowDown', false)} onPointerLeave={() => setVirtualKey('ArrowDown', false)}>▼</button>
              <button className="touch-btn right" aria-label="右" onPointerDown={() => setVirtualKey('ArrowRight', true)} onPointerUp={() => setVirtualKey('ArrowRight', false)} onPointerCancel={() => setVirtualKey('ArrowRight', false)} onPointerLeave={() => setVirtualKey('ArrowRight', false)}>▶</button>
            </div>
            <div className="touch-actions">
              <button className="touch-btn fire" aria-label="射撃" onPointerDown={() => setVirtualKey(' ', true)} onPointerUp={() => setVirtualKey(' ', false)} onPointerCancel={() => setVirtualKey(' ', false)} onPointerLeave={() => setVirtualKey(' ', false)}>FIRE</button>
              <button className="touch-btn dash" aria-label="ダッシュ" onPointerDown={triggerDash}>DASH</button>
              <button className="touch-btn slow" aria-label="スロー" onPointerDown={() => setVirtualKey('z', true)} onPointerUp={() => setVirtualKey('z', false)} onPointerCancel={() => setVirtualKey('z', false)} onPointerLeave={() => setVirtualKey('z', false)}>SLOW</button>
              <button className="touch-btn bomb" aria-label="ボム" onPointerDown={activateBomb}>BOMB</button>
              <button className="touch-btn hyper" aria-label="ハイパー" onPointerDown={activateHyper}>HYPER</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
