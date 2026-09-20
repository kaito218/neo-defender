import type { ShipId, Weapon } from '../game/model';
export type Ship = { id: ShipId; name: string; role: string; hp: number; speed: number; power: number; dash: number; color: string; weapon: Weapon; unlock: string; detail: string };
export const ships: Ship[] = [
  { id: 'A', name: 'KESTREL', role: '万能迎撃機', hp: 5, speed: 330, power: 1, dash: 2.4, color: '#62e7f7', weapon: 'TWIN', unlock: '初期配備', detail: '安定した二連砲。初めての出撃に。' },
  { id: 'B', name: 'WRAITH', role: '高速強襲機', hp: 3, speed: 440, power: .95, dash: 1.4, color: '#a2ffb1', weapon: 'HOMING', unlock: 'STAGE 1 クリア', detail: '高機動・短いダッシュ再充填。' },
  { id: 'C', name: 'BASTION', role: '重装攻撃機', hp: 8, speed: 245, power: 1.22, dash: 3.2, color: '#ffbb74', weapon: 'SPREAD', unlock: 'STAGE 3 クリア', detail: '厚い装甲と強力な砲撃。' },
  { id: 'D', name: 'ORBIT', role: 'ドローン管制機', hp: 4, speed: 315, power: .8, dash: 2.5, color: '#bb9cff', weapon: 'SPREAD', unlock: 'STAGE 2 で救援を選ぶ', detail: '二機の随伴ドローンが射線を広げる。' },
  { id: 'E', name: 'LUCENT', role: '光学砲撃機', hp: 4, speed: 300, power: .8, dash: 2.6, color: '#ff87bc', weapon: 'LASER', unlock: 'STAGE 4 クリア', detail: 'レーザー威力 +45%。狭い射線で装甲を貫く。' },
];
export const shipById = (id: ShipId) => ships.find(s => s.id === id) ?? ships[0];
