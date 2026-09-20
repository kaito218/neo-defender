import type { Dialogue, EnemyKind } from '../game/model';
export type StageEvent = { at: number; kind: 'wave' | 'dialogue' | 'midboss' | 'obstacle' | 'choice'; enemy?: EnemyKind; count?: number; text?: string };
export type Stage = { id: number; name: string; area: string; theme: string; color: string; speed: number; bgm: number; duration: number; pool: EnemyKind[]; intro: Dialogue; clear: string; events: StageEvent[] };
const phases: StageEvent[] = [
  { at: 9, kind: 'wave', enemy: 'fast', count: 5 },
  { at: 24, kind: 'wave', enemy: 'shield', count: 3 },
  { at: 39, kind: 'midboss' },
  { at: 56, kind: 'wave', enemy: 'missile', count: 4 },
];
export const stages: Stage[] = [
  { id: 1, name: '襲撃', area: 'EARTH ORBIT', theme: 'earth', color: '#56bfd4', speed: 90, bgm: 0, duration: 76, pool: ['scout', 'fast', 'rammer'], intro: { name: 'COMMAND / イリス', text: '基地が襲撃された。レオ、発進して！移動はWASDか画面タッチ。射撃はSPACE。右側から来る敵を迎撃して。' }, clear: '基地の脱出船は無事だ。新型高速機WRAITHを格納庫に配備した。敵の航跡を追う。', events: [...phases, { at: 17, kind: 'dialogue', text: 'Xでボム、SHIFTで無敵ダッシュ。Zを押している間は敵の時間を遅くできる。補給カプセルを回収して。' }] },
  { id: 2, name: '救難信号', area: 'SHATTERED COLONY', theme: 'colony', color: '#9b8ddd', speed: 110, bgm: 1, duration: 82, pool: ['drone', 'mother', 'missile'], intro: { name: 'MIRA / 救難通信', text: 'こちら輸送護衛隊……コロニー残骸で包囲されている。誰か、聞こえる？' }, clear: '通信の発信源から、敵補給基地への航路を入手した。反撃の時だ。', events: [...phases, { at: 30, kind: 'choice' }] },
  { id: 3, name: '反撃作戦', area: 'DUST FRONT', theme: 'dust', color: '#d8a576', speed: 135, bgm: 2, duration: 86, pool: ['shield', 'cruiser', 'scout', 'sniper'], intro: { name: 'COMMAND / イリス', text: '味方艦隊と連携して補給基地を叩く。敵のシールドは正面から削れる。補給網を断て！' }, clear: '基地の制圧に成功。重装機BASTIONを回収した。しかし敵は、我々の作戦を知っていた。', events: [...phases, { at: 31, kind: 'dialogue', text: '敵の主力艦が接近。仲間がいれば援護を受けられる。孤立しないで。' }] },
  { id: 4, name: '裏切り', area: 'SILENT RELAY', theme: 'relay', color: '#66cdb9', speed: 105, bgm: 3, duration: 88, pool: ['sniper', 'laser', 'fast', 'shield'], intro: { name: 'GALE / 諜報部', text: '漏洩元は人間じゃない。軍の通信網が敵AIに乗っ取られた。俺を信じて中継器を壊してくれ。' }, clear: '敵は「コーラス」。戦争を終わらせるため、全ての意思を一つに統合しようとしている。光学機LUCENTを配備した。', events: [...phases, { at: 28, kind: 'choice' }] },
  { id: 5, name: '敵領域', area: 'THE LIVING VOID', theme: 'void', color: '#bc7bde', speed: 150, bgm: 4, duration: 92, pool: ['mother', 'missile', 'rammer', 'cruiser'], intro: { name: 'LEO / ケストレル', text: '船体が……生きている？ここから先は敵の領域だ。要塞への突破口を開く！' }, clear: '双胴艦を撃破。囚われていた修復士NOAを救出した。巨大要塞の隔壁が開いている。', events: [...phases, { at: 62, kind: 'wave', enemy: 'cruiser', count: 2 }] },
  { id: 6, name: '要塞突入', area: 'INSIDE THE MACHINE', theme: 'fortress', color: '#e69c5c', speed: 165, bgm: 5, duration: 94, pool: ['turret', 'laser', 'drone', 'shield'], intro: { name: 'NOA / 修復士', text: '内部通路は狭いよ。発光する隔壁に触れないで。中枢まで、私が機体を保たせる。' }, clear: '最終防壁を突破した。コーラスの核は目前。私たちの未来は、私たちが選ぶ。', events: [...phases, ...[14, 29, 48, 65].map(at => ({ at, kind: 'obstacle' as const }))] },
  { id: 7, name: '最終決戦', area: 'HEART OF THE CHOIR', theme: 'core', color: '#e0b6ed', speed: 190, bgm: 6, duration: 78, pool: ['fast', 'laser', 'mother', 'sniper'], intro: { name: 'THE CHOIR', text: '孤独も、争いも、選択も消そう。君たちの記憶を私に預ければ、もう誰も傷つかない。' }, clear: 'コーラスの核は沈黙した。', events: [...phases, { at: 61, kind: 'dialogue', text: 'レオ：痛みがあっても、僕たちは自分で選ぶ。これで終わりだ、コーラス！' }] },
].map(stage => ({ ...stage, events: [...stage.events].sort((a, b) => a.at - b.at) })) as Stage[];
