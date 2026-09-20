# 実装・検証記録

実施日：2026-09-19～20
対象：C:\Users\oktsu\Documents\Codex\project\neo-defender

## 実装

- 1280×720の横スクロール、レスポンシブ16:9、全画面API、独立したゲームシミュレーション。
- キーボード・指追従・マルチタッチ・標準Gamepad APIをInputManagerへ統合。短い特殊操作タップも次フレームまで保持。ウィンドウ切替で停止・入力解除。
- 5種類のオリジナル自機、ハンガーと進行解放。13敵タイプ、7ステージボス、HPに応じた3フェーズ。
- 全7ステージ、2分岐、3仲間、3エンディング。各ステージに会話・編隊・中ボス、要塞ステージに障害物。
- 4武器、5レベル、DPS倍率の上限1.72倍。既存のボム・ダッシュ・スロー・ハイパー・アイテムを継承。
- 無限スコアアタック、段階的難化、3/6/10/15/20分…のボス、詳細リザルト。
- localStorage保存、旧ハイスコア移行、破損時の初期値復旧、設定・音量・難易度。
- タイトル・ハンガー・ステージ選択・操作説明・設定・ポーズ・結果、合成BGMと効果音。

## 自動検証

| 項目 | 結果 |
|---|---|
| npm run build（TypeScript＋公開用ビルド） | 成功。dist/index.html・ハッシュ付きJS/CSS生成 |
| npm run lint | 成功 |
| npm test | 11項目成功 |
| 武器4種×5レベルのDPS曲線 | 100/110/125/145/172% |
| 破損セーブ・正常セーブの往復・不正値の制限 | 成功 |
| 指追従の速度制限・指離し停止・ボム併用 | 成功 |
| キーボード・模擬パッドのデッドゾーン/ボタン/切断 | 成功 |
| 全4分岐経路で7ステージのイベントを進行 | ボス出現・3フェーズ・クリア・仲間/機体解放・エンディング確認 |
| ボムによるボス撃破 | 通常のクリア処理・報酬に合流 |
| 無限モードのボス時刻と撃破後継続 | 成功 |
| 会話開始/分岐中の時間停止 | 成功 |
| 再出撃で未来の選択・仲間が混入しない | 成功 |
| 弾650、敵42、粒子240の上限・イベント順序 | 成功 |
| フレーム間の短い特殊ボタンタップ | 1回だけ処理されることを確認 |

進行テストでは被弾無効化・ボスHP操作を使って全経路の状態遷移を検証。通常操作で全ステージを通しクリアしたという意味ではありません。

## ブラウザ検証

- ローカルの/neo-defender/配下から相対アセットをロード。
- タイトル→格納庫→会話→戦闘→ポーズ→設定→復帰、ゲームオーバー→結果→タイトルを確認。
- AUTO SHOT・難易度の変更が再読み込み後も保持されることを確認。
- 公開用dist版でボムが3個→2個になり、ポーズできることを確認。
- 公開用dist版の起動・戦闘確認中にコンソールエラーなし。
- 表示寸法1920×1080、1366×768、1180×820、844×390、667×375、390×844を検証。
- ページスクロールなし。小型横画面で見つかった端数によるはみ出しは、2pxの寸法余裕を設けて修正・再検証。
- Fullscreenボタンの表示切替は確認。ただしアプリ内ブラウザの全画面計測に制約があり、PC各ブラウザの実際の全画面/Esc復帰は別途実機確認が必要。

## ビルド環境への対応

当初、管理されたWindows実行環境でesbuildの子プロセス通信パイプがspawn EPERMとなった。`scripts/build.mjs`は通常のViteビルドを優先し、この特定のWindowsエラー時のみ、esbuild CLIによるコンパイル→Viteによる公開用パッケージ生成へ切り替える。今回の成功結果はこの代替経路によるもの。

通常のGitHub Actions/Linuxでは既存のVite設定を使う経路を実行する。Vite base './'と既存main→Actions→Pagesの構成を維持。エラーを無視して成功扱いにする処理ではなく、代替処理が失敗した場合もビルドは失敗する。

## 未確認・公開状況

- iPad/Safariとスマートフォンの実機マルチタッチ、指オフセットの体感、実機60fps。
- BluetoothのXbox/PlayStation実機での接続・切断・操作。API入力の模擬テストは実施済み。
- 全ステージを通常操作で通した難易度の体感調整。
- GitHub Pages上の実配信。GitHubへのpush・公開は未実施。

## 起動

開発時は対象フォルダーで`npm run dev`。
公開用ファイルを確認する場合は`npm run build`の後に`npm run serve`を実行し、http://127.0.0.1:4173/neo-defender/ を開く。serveはローカルPC限定で待ち受ける。

バックアップは作業タスク内work/neo-defender-backup。作業前のGitコミットはf9e66a2。変更はローカル作業ツリーに保存され、コミット/pushは行っていない。

## 2026-09-20: iPhone launch visibility and audio

- Split HANGAR into a scrolling ship/wingmate region and a persistent launch footer.
- Japanese 出撃する button shows selected ship and story stage / score attack mode.
- Added six original synthwave BGM tracks and layered shot, explosion, missile,
  bomb, warning, hyper and result effects. Added sound check and blocked-audio recovery.
- Audio initialization uses click/touchend/keydown and isolates audio failures from gameplay.
- Local static preview serves WAV MIME type and HTTP byte ranges.

Validation: production build and ESLint passed; all 13 automated tests passed,
including audio pause/resume, blocked playback recovery, failure isolation and PCM validation.
Chromium in-app browser: launch button entirely visible at 844x390 and 667x300;
launch proceeds through briefing into active gameplay, with no console errors.
Title reports SOUND ON after interaction. WAV byte-range request returned 206 with
correct Content-Range and a 44-byte RIFF header; HEAD returned 200.
Real iPhone Safari playback/touch and physical speaker output remain unverified.
No remote deployment was performed.
