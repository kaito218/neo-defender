export const choices = {
  2: { key: 'signal', title: '届いた声を、どうする？', text: '救難信号と敵司令艦の航跡。両方を追う時間はない。', options: [ { id: 'rescue', label: '救援する', detail: 'MIRA加入 / ORBIT解放 / 護衛ドローンと交戦' }, { id: 'pursue', label: '敵部隊を追跡する', detail: 'LASER強化 / 追撃部隊と交戦' } ] },
  4: { key: 'trust', title: '疑惑の向こう側', text: 'ゲイルは敵AIに侵食された中継器の破壊を提案した。司令部は彼の拘束を要求している。', options: [ { id: 'trust', label: 'ゲイルを信じる', detail: 'GALE加入 / 防御支援 / 通信網を切断' }, { id: 'secure', label: '機密情報を確保する', detail: '全武器を1段階強化 / 強化された敵指揮艦' } ] },
};
export function endingText(route: Record<string, string>) {
  if (route.signal === 'rescue' && route.trust === 'trust') return { title: 'A SKY OF OUR OWN', text: 'ミラの笑い声、ゲイルの不器用な礼、ノアの帰還報告。異なる声が通信に重なった。一つにならなくても、共に飛べる。夜明けの地球へ、四つの航跡が帰っていく。' };
  if (route.signal === 'rescue' || route.trust === 'trust') return { title: 'THE VOICES WE KEPT', text: '選べなかった道を忘れはしない。それでも、今ここに仲間の声がある。レオは失われた通信を一つずつ探しながら、新しい空を目指した。' };
  return { title: 'THE LONG WAY HOME', text: '確保した記録は人類を救った。だが沈黙した通信の向こうに、救えなかった声が残っている。レオはノアと共に再び飛び立つ。次は、その声を見失わないために。' };
}
