# NEO DEFENDER: HYPER EDITION

React + TypeScript + Vite で作られた縦スクロールシューティングゲームです。

## ローカル起動

```bash
npm ci
npm run dev
```

## ビルド確認

```bash
npm run build
```

生成物は `dist/` に出力されます。

## GitHub Pages への公開

このプロジェクトには `.github/workflows/deploy-pages.yml` が含まれています。

1. リポジトリの `main` ブランチへこのプロジェクトを push します。
2. GitHub の **Settings → Pages** を開きます。
3. **Build and deployment → Source** を **GitHub Actions** にします。
4. `main` に push すると Actions が自動でビルドし、Pages へ公開します。

Vite の `base` は `./` にしてあるため、Project Pages でもアセットが読み込めます。

## 操作

- 移動: 矢印キー / WASD
- 射撃: Space
- ボム: X
- スロー: Z
- ハイパー: C
- ダッシュ: Shift
- タッチ端末: 画面上の仮想ボタンでも操作できます。

## 今回の主な修正

- GitHub Pages 用の Vite パス設定を追加
- GitHub Actions による Pages 自動デプロイを追加
- TypeScript 5.6 でビルド不能だった設定を修正
- バリアが時間切れにならない不具合を修正
- 同一フレームで多重被弾して HP が一気に減る問題を抑制
- リスタート時のゲーム内部状態のリセットを強化
- 会話タイマーの競合を軽減
- iPad / スマートフォン向けの画面スケーリングとタッチ操作を追加
