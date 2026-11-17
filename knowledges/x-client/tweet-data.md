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

ページを読み込み直した直後の `TweetDetail` も XHR を通るかは、確認できていません。Claude in Chrome のネットワークの記録は、読み込み直後の要求を取りこぼします（[claude-in-chrome.md](../dev/claude-in-chrome.md)）。`javascript_tool` では、ページの読み込みより先にフックを仕掛けられません。

## 旧クライアント: React の props にもある

旧クライアントの DOM 要素には、`__reactFiber$<乱数>`、`__reactProps$<乱数>`、`__reactEvents$<乱数>` というプロパティが付いています。

動画の poster の `img`（`[data-testid=previewInterstitial]` の中）の `__reactFiber` から `.return` を **57 回**たどった部品の `memoizedProps.mediaDetails[0]` に、次のデータがありました。

- `type: "video"`
- `id_str: "2122404339197030400"`
- `video_info.variants`（5 本。うち mp4 は 4 本）

この段数とプロパティ名は、このページのこの要素で見つかった値です。画面の種類や再生中の状態では、まだ確かめていません。

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

## 関連

- [video-twimg.md](../media/video-twimg.md)
- [client-versions.md](client-versions.md)
- [syndication-api.md](../media/syndication-api.md)
