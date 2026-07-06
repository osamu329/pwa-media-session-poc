# Media Session Event Logger PWA

車のステアリングコントロールから PWA の Media Session API 経由で受け取れるイベントを確認するためのアプリ。

## Deploy (Cloudflare Pages)

1. [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → Create → Pages → Connect to Git
2. リポジトリ `osamu329/pwa-media-session-poc` を選択
3. ビルド設定はすべて空のまま（静的サイト）、出力ディレクトリに `/` を指定
4. 「Save and Deploy」

CLIからデプロイする場合:

```bash
npx wrangler pages deploy . --project-name=pwa-media-session-poc
```

## 使い方

1. デプロイしたURLをスマホで開く
2. 「ホーム画面に追加」でPWAとしてインストール
3. Playボタンを押して音声再生を開始
4. 車のBluetoothに接続し、ステアリングのボタンを操作
5. 受信したイベントがログに表示される
