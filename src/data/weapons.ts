import type { Weapon } from '../game/model';
export const weaponOrder: Weapon[] = ['TWIN', 'SPREAD', 'LASER', 'HOMING'];
export const weaponScale = [1, 1.1, 1.25, 1.45, 1.72];
export const weapons: Record<Weapon, { color: string; interval: number; damage: number; count: number; detail: string }> = {
  TWIN: { color: '#78f5ff', interval: .16, damage: 6, count: 2, detail: '二連装・安定した集中攻撃' },
  SPREAD: { color: '#b9f986', interval: .23, damage: 3.4, count: 5, detail: '五方向・広範囲制圧' },
  LASER: { color: '#ff8bb5', interval: .20, damage: 18, count: 1, detail: '細い射線・高い単体火力' },
  HOMING: { color: '#c7a2ff', interval: .28, damage: 6.8, count: 2, detail: '自動追尾・低威力で高命中' },
};
export function weaponStats(weapon: Weapon, level: number) {
  const base = weapons[weapon];
  const rate = level >= 4 ? 1.1 : 1;
  // Total volley DPS follows 100/110/125/145/172%; extra projectiles never multiply the curve.
  return { ...base, interval: base.interval / rate, damage: base.damage * weaponScale[Math.max(0, Math.min(4, level - 1))] / rate };
}
