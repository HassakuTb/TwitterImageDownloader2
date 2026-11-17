# 旧クライアント（responsive-web）の画像まわりの DOM

- 確認日: 2026-11-17
- 方法: Claude in Chrome でログイン済みの x.com を開き、`javascript_tool` で DOM を読み取った

## 画面ごとの目印

| 画面 | ツイート ID・画像番号 | 投稿日時 | 表示名 |
|---|---|---|---|
| ホームのタイムライン | `img.closest('a')` の href（`/photo/N`） | `article time[datetime]` | `article [data-testid=User-Name] span` |
| ツイート詳細 | 同上 | 同上 | 同上 |
| ライトボックス `/<user>/status/<id>/photo/<n>` | ページの URL | モーダル内にはない | モーダル内にはない |
| メディアタブ `/<user>/media?filter=photo` | `img.closest('a')` の href（`/photo/N`） | ない | `main [data-testid=UserName] span` |

## タイムラインとツイート詳細

- ツイートは `article[data-testid=tweet]`。
- 画像 `img` の親は `[data-testid=tweetPhoto]`。
- `img.closest('a')` の href は `/<user>/status/<id>/photo/<n>`。`img` はリンクの**中**にある。
- 投稿日時は `article` 内の `time[datetime]`（秒単位の ISO 8601）。
- 表示名は `[data-testid=User-Name]` 内の最初の `span` のテキスト。

### `/photo/N` リンクのない画像（2026-11-17 確認）

`@NASA` のタイムラインで、`[data-testid=previewInterstitial]` の中の `pbs.twimg.com/media` の `img`（`HXRLj6bW0AAxO8n`）は、`<a>` に包まれていませんでした。`article` 内に `/photo/N` リンクもありません。`/media/` の画像がすべて写真とは限りません。

2026-11-17 追記: この `img` は、動画（`/NASA/status/2122404409292337592`）の poster でした。下の「動画（再生前）」を参照してください。

## 動画（再生前）（2026-11-17 確認）

`/NASA/status/2122404409292337592` のツイート詳細を開いた直後（再生前）の DOM です。

- `<video>` 要素は 0 件でした。
- poster の `img` の祖先は `IMG < DIV < DIV < DIV[data-testid=previewInterstitial] < DIV < DIV < DIV < DIV[data-testid=tweetPhoto] < …` でした。画像と同じ `tweetPhoto` の中にあります。
- `img` の src は `https://pbs.twimg.com/media/HXRLj6bW0AAxO8n?…` で、画像と同じ形です。
- `article` 内の `data-testid` には `playButton` がありました。
- `/video/N` のリンクも `/photo/N` のリンクもありません。ツイート ID は、`article` 内の `/status/<id>` のリンクから取れます。
- mp4 の URL は DOM のどこにもありません。React の props とネットワークの応答にあります（[tweet-data.md](tweet-data.md)）。

## 動画・GIF の再生中と、GIF の再生前（2026-11-17 確認）

ログイン済みの旧クライアントで、`@GIPHY` のプロフィールの GIF と `/NASA/status/2122404409292337592` の動画を、`playButton` を `click()` して再生しました（自動再生はオフの設定でした）。

### GIF（再生前）

- 動画と同じで、`[data-testid=tweetPhoto]` > `[data-testid=previewInterstitial]` の中の `img` と `playButton` だけでした。`<video>` はありません。
- `img` の src は `pbs.twimg.com/tweet_video_thumb/<キー>?…` です。

### 再生中

- `<video>` は `[data-testid=videoPlayer]` > … > `[data-testid=videoComponent]` > `DIV` > `DIV` > `VIDEO` の位置にできました。`previewInterstitial` は消えます。
- GIF の `<video>` は `src="https://video.twimg.com/tweet_video/<キー>.mp4"`、`poster="…/tweet_video_thumb/<キー>.jpg"` でした。mp4 の URL が DOM に直接あります。
- 動画の `<video>` は `src="blob:https://x.com/…"` で、`poster="https://pbs.twimg.com/media/<mediaId>.jpg"`（拡張子つきの古い形）でした。
- 再生中の画面で右クリックが当たるのは `<video>` ではありませんでした。`elementFromPoint` の結果は、中央が一時停止・再生の `BUTTON`（の `svg`）、それ以外は `opacity: 0` の poster の `img`（`…/media/<mediaId>.jpg`、`[data-testid=videoComponent]` の中）でした。ブラウザのメニューは image コンテキストになる見込みです（未確認）。

2026-11-17 追記（拡張を入れた Chrome で確認）: 再生を始めたあとは、マウスを動画の上に置くと操作用の透明な層（`[data-testid=videoComponent]` の中の `DIV`。`document.elementsFromPoint` で `<video>` より上に 3 つ）が出ます。右クリックはこの `DIV` に当たり、ブラウザのメニューは image / video コンテキストになりません。右ボタンの `mousedown`（`window` の capture フェーズ）で、これらの層に `pointer-events: none` を付けると、続く右クリックは `<video>` に当たり、拡張の video コンテキストの項目が出ました（Shift + 右クリック、ユーザーが手で確認）。

### 写真と動画が混ざったツイート

検索 `filter:images filter:native_video` の結果で確認しました。

- `/photo/N` の N は、動画も数えた位置でした。例: 10 個のメディアのうち 8 番目が動画のツイートで、写真のリンクは photo1〜photo7、photo9、photo10。
- 動画のセルには `/photo/N` も `/video/N` のリンクもありません。
- DOM のセルの順と、データ（React の props の `mediaDetails`）の並び順は一致しました。

### 引用ツイート（2026-11-17 確認）

- 引用元の画像の `img.closest('a')` は、引用元のツイートの `/<引用元>/status/<id>/photo/<n>` です。
- `article` 内に `time` が 2 つあり、最初のものは外側（引用した側）のツイートの日時です。`article time` の最初の要素を取ると、引用元の画像に外側の日時が付きます。
- 引用元のユーザーの `a[href="/<引用元>"]` は `article` 内にありません（[display-name.md](display-name.md)）。

## ライトボックス

- 画像は `[aria-modal=true]` の中にあります。
- 背後の画面（タイムラインやメディアタブ）の DOM は残っています。ページ全体の `article time` の最初の要素は、開いた画像とは別のツイートの日時になることがあります（2026-11-17、`/NASA/status/2121280846183137564/photo/1` で、最初の `time` は 2026-11-16 の別のツイートのものでした。開いたツイートの日時は 2026-11-13）。
- モーダル内に `/photo/N` リンクは 0 件でした。
- モーダル内の `img` は `<a>` に包まれていません。
- モーダル内に `time` と `User-Name` はありません。
- ページの URL が `/<user>/status/<id>/photo/<n>` になるので、そこからユーザー ID、ツイート ID、画像番号を取れます。
- 表示名は、`body` 内の `a[href="/<user>"]` のうち `@` で始まらないテキストから取れます（[display-name.md](display-name.md)）。

## 画像の src

- `img` の src は `https://pbs.twimg.com/media/<id>?format=<jpg|png>&name=...` の形です。
- ログイン時のホームで集めた 56 件はすべて `format=jpg` でした。ドット絵の検索では `format=png` の画像が見つかりました。
- 旧クライアントの src には原本の形式がそのまま出ていると見られます。新クライアントでは `format=webp` になるので、DOM から形式を判別できません（[pbs-twimg-orig.md](../media/pbs-twimg-orig.md)）。

## 関連

- [x-web-dom.md](x-web-dom.md)
- [media-tab.md](media-tab.md)
