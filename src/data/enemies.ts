import type { EnemyKind } from '../game/model';
export const enemies: Record<EnemyKind, { hp: number; speed: number; w: number; h: number; interval: number; color: string }> = {
  scout: { hp: 18, speed: 145, w: 52, h: 28, interval: 2.6, color: '#ff9479' },
  fast: { hp: 12, speed: 270, w: 52, h: 22, interval: 3, color: '#ffcb7a' },
  rammer: { hp: 26, speed: 205, w: 64, h: 38, interval: 8, color: '#ff5e76' },
  missile: { hp: 34, speed: 92, w: 70, h: 38, interval: 2.2, color: '#ba8eff' },
  sniper: { hp: 25, speed: 62, w: 84, h: 26, interval: 3.3, color: '#ffb95e' },
  laser: { hp: 48, speed: 65, w: 84, h: 40, interval: 3.6, color: '#ff68b8' },
  shield: { hp: 42, speed: 80, w: 70, h: 55, interval: 2.4, color: '#7fd8ef' },
  drone: { hp: 10, speed: 170, w: 30, h: 26, interval: 2.9, color: '#b3a8ff' },
  mother: { hp: 110, speed: 52, w: 142, h: 74, interval: 3.1, color: '#a08aff' },
  cruiser: { hp: 160, speed: 48, w: 175, h: 88, interval: 2, color: '#fc8d91' },
  turret: { hp: 45, speed: 90, w: 65, h: 44, interval: 1.8, color: '#f8bc75' },
  midboss: { hp: 330, speed: 28, w: 230, h: 128, interval: 1.7, color: '#e09aff' },
  boss: { hp: 1400, speed: 60, w: 390, h: 240, interval: 1.3, color: '#ff6f8e' },
};
