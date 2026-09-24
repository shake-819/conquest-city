# CITY WARS

ブラウザで遊べる、3D街づくり×バトルのRTSです。

- **街モード**: 30×30のグリッドに建物を建てて街を発展させる(街レベル30まで)
- **バトルモード**: 陣形6種・戦術5種を選んで、敵の拠点に攻め込む
- 兵種のティア(最大10)、研究ツリー、ヒーロー、ステージ選択(難易度別)
- 進行状況は**このブラウザ(localStorage)に自動保存**されます

サーバーは不要で、静的サイトとして動きます。

## ローカルで動かす

```bash
pnpm install
pnpm --filter @workspace/rts-game run dev     # http://localhost:22664
```

## GitHub Pages で公開する

1. このリポジトリを GitHub にプッシュする(`main` ブランチ)
2. リポジトリの **Settings → Pages → Source** を **GitHub Actions** にする
3. `main` にプッシュすると、`.github/workflows/deploy-pages.yml` が自動でビルドして公開する
4. `https://<ユーザー名>.github.io/<リポジトリ名>/` で遊べる

独自ドメインやユーザーサイト(`<ユーザー名>.github.io`)で公開する場合は、ワークフロー内の `BASE_PATH` を `/` にしてください。

### 手動でアップロードして公開する場合

```bash
BASE_PATH=/ pnpm --filter @workspace/rts-game run build
```

できた `artifacts/rts-game/dist/public` フォルダを、Cloudflare Pages や Netlify にアップロードすれば公開できます。

## 構成

```
artifacts/
  rts-game/   ゲーム本体(React + Three.js + TypeScript + Vite)
  api-server/ 未使用(将来のオンライン機能用のひな形)
lib/          共有ライブラリ(未使用のひな形を含む)
```

`api-server` と `lib/db` などは、ゲームからは呼ばれていません。将来、クラウドセーブや対戦を足すときの土台です。

## 注意

- セーブはブラウザ内だけなので、ブラウザのデータを消すと進行も消えます。
- 開発モード(`pnpm dev`)でだけ表示される「開発者用」パネルがあります。公開ビルドには含まれません。
