# NEO DEFENDER — Orbital Defense

React + TypeScript + Vite / Canvas 2D の横スクロールシューティング。

## 起動

```sh
npm ci
npm run dev
```

表示されたローカルURLをブラウザで開いてください。iPad・スマートフォンでは横向きを推奨します。

```sh
npm test
npm run lint
npm run build
npm run serve
```

## 内容

- 1280×720、16:9の自動縮小表示、Fullscreen API、ページスクロール抑止
- STORY MODE：全7ステージ、全ステージボス、各ボス3フェーズ、2か所の選択、3種類のエンディング
- HANGAR：5機体。進行・救援で解放。選択機体・仲間・性能を表示
- 仲間：ミサイル支援のMIRA、防御支援のGALE、修復支援のNOA。被弾時は7秒離脱
- 武器：TWIN / SPREAD / LASER / HOMING。Lv1–5の基本DPS倍率は1 / 1.1 / 1.25 / 1.45 / 1.72
- ボム、無敵ダッシュ、スロー、ハイパー、バリア、回復、支援ドローン
- SCORE ATTACK：ゲームオーバーまで継続。3 / 6 / 10 / 15 / 20分…にボス出現
- 合成BGMと効果音。個別音量、画面揺れ抑制、AUTO SHOT、タッチオフセット、3難易度
- localStorageで進行・機体・仲間・分岐・モード別ハイスコア・設定を保存。旧highScoreを移行

## 操作

| 操作 | キーボード | 標準ゲームパッド |
|---|---|---|
| 移動 | WASD / 方向キー | 左スティック / 十字キー |
| 射撃 | Space | A / Cross |
| ボム | X | B / Circle |
| ダッシュ | Shift | X / Square |
| ハイパー | C | Y / Triangle |
| スロー（長押し） | Z | LB / L1 |
| 武器切替 | Q / E | RB / R1 |
| ポーズ | Esc | Start / Options |

タッチ：画面上の指を目標として一定速度で追従、離すと停止。特殊ボタンは別の指で同時操作。仮想スティックはありません。タッチ端末では初回AUTO SHOT ON。全画面API非対応の端末では案内を表示します。

キーボードのメニュー操作はTab・Enter。パッドはスティックとAでメニュー選択。ブラウザがパッドを検出するまで一度ボタンを押してください。

## セーブと再開

ステージ開始地点のチェックポイントを保存します。戦闘途中の弾・HP・スコアは復元しません。STAGE SELECTで到達済みステージへ出撃可能。新しい出撃やステージ再訪は、その章以降の分岐を選び直せます。入手済み機体・仲間の解放記録、クリア済みステージ、ハイスコアは保持します。ストーリーの随伴仲間はその出撃ルートで決まり、スコアアタックでは加入済み仲間を利用します。

## コード構成

- `src/game/Game.ts`：時間ベースのシミュレーション、戦闘、進行
- `src/game/InputManager.ts`：Keyboard / Pointer / Gamepadの共通入力
- `src/game/Renderer.ts`：多層背景、オリジナル機体・敵・ボスのCanvas描画
- `src/game/Audio.ts`：Web AudioによるBGM・効果音
- `src/game/SaveData.ts`：検証付き保存・移行・破損時復旧
- `src/data/`：機体、武器、敵、ボス、ステージイベント、仲間、分岐・エンディング
- `src/App.tsx`：Reactメニュー・HUD・タッチ操作。戦闘ループの状態はゲーム本体で保持
- `tests/game.test.mjs`：ゲーム進行、入力、武器曲線、セーブ等の回帰テスト

ステージ追加は`stages.ts`と対応する`bosses.ts`のデータから行います。イベントは秒単位で定義します。最終ステージ判定とセーブ検証の上限はステージ数に追従します。新しい分岐や特殊ボスを追加する場合は対応するイベント処理も更新してください。

## GitHub Pages

既存の`base: './'`と`.github/workflows/deploy-pages.yml`を維持しています。mainへのpushでGitHub ActionsがビルドしてPagesへ公開します。今回のローカル改修ではpushしていません。

実施した検証と未確認項目は`docs/VERIFICATION.md`を参照してください。



ビルドは通常のViteを優先し、管理されたWindows環境で子プロセス通信が拒否される場合のみ二段階の同等ビルドへ切り替わります。
`npm run serve`はdistをローカルPCの4173番ポートで表示します。
