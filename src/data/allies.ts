import type { AllyId } from '../game/model';
export const allies: Record<AllyId, { name: string; role: string; color: string; weapon: 'TWIN' | 'HOMING'; detail: string }> = {
  mira: { name: 'MIRA', role: 'ミサイル支援', color: '#c0a2ff', weapon: 'HOMING', detail: 'STAGE 2 救援で加入。追尾弾で援護。' },
  gale: { name: 'GALE', role: '防御支援', color: '#91f3d1', weapon: 'TWIN', detail: 'STAGE 4 信頼で加入。定期的にバリアを供給。' },
  noa: { name: 'NOA', role: '修復支援', color: '#ffa5c5', weapon: 'TWIN', detail: 'STAGE 5 撃破で加入。一定時間ごとに修復。' },
};
