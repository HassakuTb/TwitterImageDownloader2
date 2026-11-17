# ページがツイートのデータを得ている場所

- 確認日: 2026-11-17
- 方法:
  - 旧クライアント（ログイン済み）: Claude in Chrome の `javascript_tool` で、ページの JavaScript の世界から調べた
  - 新クライアント x-web（ログアウト）: curl で取得した SSR の HTML を解析した

動画の mp4 の URL は DOM にありません（[video-twimg.md](../media/video-twimg.md)、[responsive-web-dom.md](responsive-web-dom.md)、[x-web-dom.md](x-web-dom.md)）。この URL を持っているのは、ページが受け取るツイートのデータ（GraphQL の応答）だけです。そのデータがどこにあるかを調べました。

## 旧クライアント: GraphQL の応答は XHR で届く

プロフィール `/NASA` を開いたあと、`XMLHttpRequest.prototype.open` / `send` と `window.fetch` を差し替えて、応答を記録しました。そのうえで `history.pushState` と `popstate` を使い、動画のツイート `/NASA/status/2122404409292337592` に画面を切り替えました。

| 手段 | 要求 | 応答の長さ（字） | `video_info` |
|---|---|---|---|
| XHR | `TweetResultByRestId` | 6,948 | 2 件（対象の poster の ID を含む） |
| XHR | `TweetDetail` | 151,376 | 2 件（対象の poster の ID を含む） |
| XHR | `fleetline`、`viewer_context.json`、`getAltTextPromptPreference`、`avatar_content`、`timeline.json` | — | なし |

- ツイートのデータは `fetch` ではなく **XMLHttpRequest** で届きました。この操作の範囲では、`/i/api/` への `fetch` は 0 件でした。
- フックはページの読み込みが終わってから仕掛けましたが、それでも拾えました。X は XHR のメソッドを読み込み時に控えていない、と見られます。
- 要求の URL は `https://x.com/i/api/graphql/<queryId>/<操作名>?variables=…&features=…` の形です（`TweetDetail` の queryId は `dQDdKtt882nl-Km98FJGSQ`、`TweetResultByRestId` は `U8lc5aomF5krJzZ9vJ9wxg`）。

### ほかの場所にはなかった

- ツイート詳細の HTML（cookie 付きで取得、317,543 字）に `video_info` はなく、`video.twimg.com` の mp4 もありませんでした。
- `window.__INITIAL_STATE__` はありませんでした。
- サービスワーカー `sw.js`（54,945 字）に `graphql` と `/i/api` の文字列はありませんでした。サービスワーカーが API を代わりに処理しているのではないと見られます。
- `performance.getEntriesByType('resource')` は 0 件でした。X が resource timing を消していると見られます。

### 未確認

ページを読み込み直した直後の `TweetDetail` も XHR を通るかは、確認できていません。

2026-11-17 追記: 拡張の MAIN world 用スクリプトを `registerContentScripts`（world MAIN、document_start）で登録した Chrome で、ツイート詳細 `/NASA/status/2122404409292337592` を新しいタブで開くと、スクリプトは `document.readyState` が `loading` の時点で動き、読み込み直後の **XHR** の `TweetResultByRestId`（6,948 字、対象の動画を含む）を拾えました。この読み込みの直後には、`TweetDetail` のログは出ませんでした。Claude in Chrome のネットワークの記録は、読み込み直後の要求を取りこぼします（[claude-in-chrome.md](../dev/claude-in-chrome.md)）。`javascript_tool` では、ページの読み込みより先にフックを仕掛けられません。

## 旧クライアント: React の props にもある

旧クライアントの DOM 要素には、`__reactFiber$<乱数>`、`__reactProps$<乱数>`、`__reactEvents$<乱数>` というプロパティが付いています。

動画の poster の `img`（`[data-testid=previewInterstitial]` の中）の `__reactFiber` から `.return` を **57 回**たどった部品の `memoizedProps.mediaDetails[0]` に、次のデータがありました。

- `type: "video"`
- `id_str: "2122404339197030400"`
- `video_info.variants`（5 本。うち mp4 は 4 本）

この段数とプロパティ名は、このページのこの要素で見つかった値です。

2026-11-17 追記（ほかの状態、[responsive-web-dom.md](responsive-web-dom.md)）:

| 状態 | 起点の要素 | `memoizedProps.mediaDetails` までの段数 |
|---|---|---|
| 再生前の動画・GIF（プロフィール、詳細） | poster の `img` | 57 |
| 再生中の GIF・動画 | `<video>` の 2 つ上の `DIV`（`<video>` 自体には `__reactFiber` がない） | 93 |
| 再生中の動画 | 右クリックが当たる `opacity: 0` の poster の `img` | 131 |

- `mediaDetails` はツイートのメディア全部の配列で、並び順は DOM のセルの順と同じでした。
- 各メディアの `expanded_url` は `https://x.com/<user>/status/<id>/photo/<N>` または `…/video/<N>` で、N はツイート内の位置（1 始まり、動画も数える）です。
- `media_url_https` は、ページに出ている poster と同じキーを含みました（`/media/<mediaId>.jpg`、`amplify_video_thumb/<数値ID>/img/<キー>.jpg`、`tweet_video_thumb/<キー>.jpg`）。
- GIF は `type: "animated_gif"` で、variants は 1 本でした。

これらのプロパティは、ページの JavaScript の世界で付けられたものです。`javascript_tool` はページの世界でコードを動かすので読めました。拡張の content script は既定で別の世界（isolated world）で動くので、そのままでは読めません（Chrome の仕様による。今回は試していません。[main-world.md](../extension/main-world.md)）。

## 新クライアント x-web: SSR の HTML に埋め込まれている

ログアウト版の SSR の HTML には、TanStack Router がストリーミングで渡す `<script>` があります（`self.$_TSR`、`$R[…]` で始まるもの）。その中に、GraphQL の応答が JSON の文字列として（`\"` でエスケープされた形で）入っていました。

| ページ | HTML の長さ | `video_info` の件数 |
|---|---|---|
| プロフィール `/NASA` | 159,648 バイト | 1 |
| ツイート詳細 `/NASA/status/2122404409292337592` | 141,426 バイト | 3 |

- 応答の形は旧クライアントが受け取るものと同じで、`__typename: "TimelineTimelineItem"`、`entry_id: "tweet-<id>"`、`rest_id` などがありました。
- メディアのフィールド（`type`、`id_str`、`media_url_https`、`video_info`）も同じです（[video-twimg.md](../media/video-twimg.md)）。
- `legacy.entities.media[].expanded_url` は `https://x.com/NASA/status/2122404409292337592/video/1` でした。`/video/N` はデータの中にはありますが、DOM のリンクにはありません。
- cookie なしでツイート詳細を取得しても、そのツイートの `video_info` が入っていました。

### 未確認

- x-web で画面を切り替えたとき、データをどの通信（`fetch` か XHR か）で受け取るか
- ログイン時の x-web でも、同じように埋め込まれるか
- x-web の React の props の形

## 2026-11-17 追記: 拡張の試作で確かめたこと

拡張の MAIN world 用スクリプト（`app/scripts/PageWorld.ts`）を、Claude in Chrome の `javascript_tool` でログイン済みのページ（旧クライアント）に読み込み後に流し込んで確かめました。document_start で登録した状態は、まだ確かめていません。

- 読み込み後に `XMLHttpRequest.prototype` を差し替えても、画面を切り替えたときの GraphQL の応答を拾えました。`video_info` を含んでいた応答は、`UserOriginalsTimeline`（プロフィール、132,300 字、のべ 34 件）と `SearchTimeline`（検索、255,910 字、のべ 50 件）でした。同じメディアが応答の中に何度も出てきます。
- 応答の JSON から `"video_info"` を含むオブジェクトだけを取り出して照合する方法で、プロフィールの動画・GIF と、検索結果の写真と動画が混ざったツイートを特定できました。
- 表に入っていないツイート（流し込む前に表示されていたもの）は、React の props から見つかりました（poster の `img` から 57 段）。

### x-web の埋め込みデータの形

- ログアウト版の SSR で、`video_info` を含む `<script>` の中身は、`(self.$R=self.$R||{})["tsr"]=[];self.$_TSR={…}` や `($R=>$R[21].next(…))` の形の JavaScript でした。GraphQL の応答は、その中の **JavaScript の文字列リテラル**に、JSON の文字列として入っています（`\"` でエスケープ）。
- 文字列リテラルを `JSON.parse('"' + 中身 + '"')` で戻すと JSON の文字列になり、その中の `"video_info"` を含むオブジェクトを取り出せました。NASA のツイート詳細から 3 件、`@GIPHY` のプロフィールから 5 件（動画 1、GIF 4）でした（node で確認）。
- `$_TSR` は、hydration とストリームの終わりのあとで自分を消すコード（`delete self.$_TSR`）を持っています。読み込みが終わってから `window.$_TSR` を読む方法は使えない見込みです。

## ツイート単位のメディアの一覧（2026-11-17 確認）

- 方法: Claude in Chrome（ログイン済み、旧クライアント）。`javascript_tool` で XHR をフックし、`history.pushState` と `popstate` で検索 `from:NASA filter:quote filter:images` に切り替えた。

### GraphQL の応答

`SearchTimeline`（172,621 字）に、`extended_entities.media` を持つオブジェクトが 22 件ありました。どれもツイートの `legacy` で、次の 2 つの場所にありました。

| 場所（末尾） | 中身 |
|---|---|
| `itemContent.tweet_results.result.legacy` | タイムラインのツイート |
| `result.quoted_status_result.result.legacy` | 引用元のツイート |

- `legacy` には `id_str`（ツイート ID）と `extended_entities.media` があります。`entities.media` も並んでいます。
- `extended_entities.media` の並び順は、ツイート内の位置の順でした。2 枚のツイートでは、`expanded_url` が `…/photo/1` と `…/photo/2` でした。
- 各メディアには、`type`（`photo` / `video` / `animated_gif`）、`id_str`、`media_url_https`、`expanded_url` があります。
- 写真の `media_url_https` は `https://pbs.twimg.com/media/<key>.<jpg|png>` です。22 件の拡張子を、`format=jpg` と `format=png` の HEAD（`name=orig`）と比べると、すべて 200 になった形式と一致しました。うち 2 件が PNG でした（[pbs-twimg-orig.md](../media/pbs-twimg-orig.md)）。
- この 22 件に `source_status_id_str` を持つメディアはありませんでした。ほかのツイートのメディアを使い回したツイートの形は、まだ確かめていません。
- リツイートの形（`legacy.retweeted_status_result`）も、この画面にはなかったので確かめていません。

### x-web の SSR に埋め込まれたツイートの形

2026-11-17 に、前に curl で取得したログアウト版の SSR（`/NASA/status/2122404409292337592`、`/GIPHY`）を node で解析しました。旧クライアントの GraphQL とは形が違いました。

- ツイートは `__typename: "Tweet"` のオブジェクトで、ツイート ID は `rest_id` にあります。`legacy` には `id_str` も `extended_entities` もありません（`legacy.entities.media` には `expanded_url` だけがありました）。
- メディアは `media_entities2` の配列にあります。各要素には `type`、`id_str`、`media_url_https`、`expanded_url`、動画なら `video_info` があります。メディアのないツイートでは空の配列でした。
- ユーザーは `core.user_results.result.core` の `screen_name` と `name` にあります。
- 引用は `quoted_tweet_results` にありました。
- GIPHY のプロフィールでは、メディア付きのツイートが 5 件（動画 1、GIF 4）でした。GIF の `expanded_url` は `…/photo/1` でした。

### React の props: 要素が属するツイート

本文（`[data-testid=tweetText]`）の `__reactFiber` から `.return` をたどると、`memoizedProps.tweet` に、その本文が属するツイートのデータがありました。

| 起点 | 最初に `memoizedProps.tweet` が見つかった段 | そのツイート |
|---|---|---|
| 本体の本文 | 64 | 本体 |
| 引用元の本文 | 35（同じ段に `quotingTweet` = 本体） | 引用元 |

- 引用元の本文から上にたどっても、最初に見つかる `tweet` は引用元でした。さらに上（39 段、79 段）では、本体の `tweet` が見つかります。
- `tweet` には `id_str`、`user`（`screen_name`、`name`、`id_str` など）、`extended_entities.media`、`permalink`、`quoted_status` などがあります。メディアのフィールドは GraphQL と同じで、動画には `video_info.variants` もありました。

## 関連

## 関連

- [video-twimg.md](../media/video-twimg.md)
- [client-versions.md](client-versions.md)
- [syndication-api.md](../media/syndication-api.md)
