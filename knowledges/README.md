# knowledges

X（旧 Twitter）の Web クライアント、画像配信、ブラウザ拡張などについて、調査して確認したことを集める場所です。

## 書き方

- 1 ファイルに 1 つのテーマを書く。テーマが増えたらディレクトリで分ける。
- 各ファイルの先頭に、確かめた日と方法を書く。
- 書くのは調べてわかった事実。この拡張の実装の説明、設計の判断、作業の計画は書かない。
- 実物で確かめていない予測は、「未確認」と明記して事実と分ける。

調査は 2026-11-03〜2026-11-17 に行いました。X の配信内容は頻繁に変わるので、使う前に日付を見てください。

## 目次

### x-client/ — X の Web クライアントの挙動

- [client-versions.md](x-client/client-versions.md) — 旧クライアント（responsive-web）と新クライアント（x-web）のどちらが配信されるか、見分け方
- [responsive-web-dom.md](x-client/responsive-web-dom.md) — 旧クライアント（ログイン時）の画像まわりの DOM
- [x-web-dom.md](x-client/x-web-dom.md) — 新クライアント（ログアウト時）の画像まわりの DOM
- [media-tab.md](x-client/media-tab.md) — プロフィールのメディアタブが「動画 / 画像」に分かれた件
- [context-menu.md](x-client/context-menu.md) — 画像を右クリックしたときの X 独自メニュー（旧・新クライアント）と、標準のメニューを出す方法
- [display-name.md](x-client/display-name.md) — 表示名の取り方と絵文字の扱い
- [logged-out-access.md](x-client/logged-out-access.md) — ログアウト状態で見られるページ
- [tweet-data.md](x-client/tweet-data.md) — ページがツイートのデータ（動画の URL を含む）を得ている場所（旧クライアントの XHR、React の props、x-web の SSR への埋め込み）

### media/ — 画像とツイートのメタデータ

- [pbs-twimg-orig.md](media/pbs-twimg-orig.md) — `pbs.twimg.com` の原寸画像 URL と format の挙動
- [snowflake.md](media/snowflake.md) — Tweet ID から投稿日時を計算する方法
- [syndication-api.md](media/syndication-api.md) — `cdn.syndication.twimg.com/tweet-result` の仕様と制約
- [video-twimg.md](media/video-twimg.md) — 動画と GIF の配信（`video.twimg.com` の URL の形、画質、HLS、GIF の実体が mp4 であること、poster の形）

### extension/ — ブラウザ拡張の API とブラウザのバージョン

- [main-world.md](extension/main-world.md) — ページの JavaScript の世界（MAIN world）で content script を動かす方法と対応バージョン
- [browser-version-share.md](extension/browser-version-share.md) — Chrome と Firefox のバージョン別シェア

### dev/ — 調査の手段

- [claude-in-chrome.md](dev/claude-in-chrome.md) — Claude in Chrome でログイン済みの x.com を調べる方法
