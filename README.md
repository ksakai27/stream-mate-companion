# Stream Mate Companion MVP

このリポジトリは、ストリーマー向けのコンパニオンアプリです。

選択されたデプロイモデルは以下の通りです：

- コードを GitHub に保管
- ストリーミング PC で小型ローカルヘルパーを実行
- ブラウザで `localhost` の UI を開く

これにより、MVP は別のクラウドサーバーを必要としません。

GitHub Pages で試したい場合、正しい分割は以下の通りです：

- GitHub Pages は静的ブラウザ UI をホスト
- ストリーミング PC は引き続き `127.0.0.1:3030` でローカルヘルパーを実行

GitHub Pages は静的ホスティングのみであるため、ヘルパー API 自体を実行することはできません。

## 現在の機能

- ローカルブラウザパネルを表示
- ブラウザでマイク音声をキャプチャ
- 短い音声チャンクをローカルヘルパーに送信して文字起こし
- 最近のストリーマースピーチ、チャットフロー、VC コンテキスト、ゲーム状態を受け入れ
- 以下の短いローカルアドバイスカードを返す：
  - ペーシング調整
  - トピック復帰
  - 初見ユーザー向けコンテキストヘルプ
  - エネルギー変化
  - クリップヒント
- 設定されている場合は OpenAI を使用
- OpenAI が設定されていない場合はローカルルールベースのアドバイスにフォールバック

## 重要な注記

このバージョンは Twitch チャットに投稿しません。

意図的にローカル実験であり、ストリーマーがポスト機能を検討する前に、安全にアドバイスをテストできるようにしています。

## コアファイル

- [server.mjs](server.mjs)
- [start-local-helper.ps1](start-local-helper.ps1)
- [config.example.json](config.example.json)
- [config.local.template.json](config.local.template.json)
- [docs/mvp-spec.md](docs/mvp-spec.md)
- [docs/localhost-architecture.md](docs/localhost-architecture.md)
- [src/prompt.mjs](src/prompt.mjs)
- [src/fallback.mjs](src/fallback.mjs)
- [public/index.html](public/index.html)

## ローカルヘルパーモデル

GitHub はコードを保管します。

ストリーミング PC はヘルパーをローカルで実行し、シークレットもローカルに保管します：

- `OpenAI API キー`
- 後でチャット読み込みが追加された場合の将来の Twitch トークン

ブラウザ UI は `127.0.0.1` のローカルヘルパーとのみ通信します。

## セットアップ

1. `config.local.template.json` を `config.local.json` にコピー
2. `openai.apiKey` に入力
3. `openai.model` でモデルを設定
4. ローカルヘルパーを実行
5. `http://127.0.0.1:3030` を開く

## 実行

推奨：

```powershell
.
start-local-helper.ps1
```

直接実行：

```powershell
& 'C:\Users\kesakai\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' .\server.mjs
```

## GitHub で試す

GitHub Pages バージョンはフロントエンドのみをホストします。
ローカルヘルパーは引き続き PC で実行されます。

1. このフォルダを GitHub リポジトリにプッシュ
2. このリポジトリの GitHub Pages を有効化
3. `.
start-local-helper.ps1` でローカルヘルパーを PC で実行
4. ブラウザで GitHub Pages URL を開く
5. ヘルパー URL を `http://127.0.0.1:3030` に設定し、`Connect helper` をクリック

注：

- GitHub Pages は静的ホスティングなため、ブラウザページはローカルヘルパーとのオリジン間で通信します
- ヘルパーは `https://*.github.io` からのリクエストを許可
- ブラウザは一般的に `http://127.0.0.1` などのループバックアドレスへのアクセスを許可
- 実際のストリーミング PC では、ローカルヘルパーモデルが推奨されるデプロイメント

## 設定上の注意

`config.local.json` をコミットしないでください。

`.gitignore` で無視されるため、キーはストリーミング PC にローカルのままになります。

## 現在のスコープ

実装済み：

- ローカルヘルパー HTTP サーバー
- ブラウザ UI
- ローカルヘルパーを通じたチャンク化マイク文字起こし
- OpenAI ベースのアドバイス生成
- フォールバックアドバイス生成
- コンパニオンペルソナルール

未実装：

- Twitch EventSub チャット受信
- フル低レイテンシー Realtime API 文字起こし
- Twitch ポスト機能

## 推奨される次のステップ

1. EventSub WebSocket を通じて Twitch チャット受信を追加
2. トランスクリプトとチャットをローリングコンテキストウィンドウにマージ
3. フィラーワードと繰り返しチャンクのライブトランスクリプトクリーンアップを改善
4. 必要に応じて、チャンク化文字起こしをフル realtime 接続にアップグレード
5. 実験が安全に感じられるまで、アプリを提案のみのライブモードで保持
