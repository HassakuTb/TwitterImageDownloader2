# Tweet ID から投稿日時を計算する方法

- 確認日: 2026-11-03、2026-11-17
- 方法: syndication API の `created_at` と比べた

## 計算式

Tweet ID は Snowflake 形式で、上位のビットに投稿時刻が入っています。

```
投稿時刻（UNIX ミリ秒） = (TweetID >> 22) + 1288834974657
```

`1288834974657` は Twitter の Snowflake のエポック（2010-11-04T01:42:54.657Z）です。

## JavaScript で書くときの注意

Tweet ID は 2^53 を超えるので、`Number` に変換すると精度が落ちます。`BigInt` で計算してください。

```ts
function tweetIdToDate(tweetId: string): Date {
    const ms = (BigInt(tweetId) >> 22n) + 1288834974657n;
    return new Date(Number(ms));
}
```

## 確認した例

| Tweet ID | 計算結果 | syndication API の `created_at` |
|---|---|---|
| `2122526407998017996` | `2026-11-17T03:05:04.957Z` | `2026-11-17T03:05:04.000Z` |

計算結果はミリ秒まで出ますが、`created_at` と旧クライアントの `time[datetime]` は秒単位です。秒までは一致します。

## 使いどころ

- 新クライアントには `<time datetime>` がないので、DOM から投稿日時を取れません（[x-web-dom.md](../x-client/x-web-dom.md)）。ID から計算すれば、通信も DOM も不要です。
- 旧クライアントでも同じ方法が使えます。
