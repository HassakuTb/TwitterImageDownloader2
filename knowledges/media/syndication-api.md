# syndication API（cdn.syndication.twimg.com/tweet-result）

- 確認日: 2026-11-03、2026-11-17
- 方法: curl（認証なし）
- 位置づけ: X 公式の「ツイート埋め込み」ウィジェットが裏で使っている非公式のエンドポイント。ドキュメントはなく、いつ変わるかわからない

## 呼び方

```
GET https://cdn.syndication.twimg.com/tweet-result?id=<TweetID>&token=<token>
```

`token` は公式ウィジェットと同じ式で計算します。

```js
const token = ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, '');
```

- 認証も Cookie も不要です。
- 2026-11-17 の時点では、`token` が不正な値でも、空でも、省略しても 200 が返りました。検証されていません。将来チェックが入る可能性があるので、式どおりに付けるのが無難です。
- 存在しない ID では、404 で HTML のエラーページが返ります。

## 使えるフィールド

Tweet ID `2122526407998017996` で取得した値です。

| 用途 | フィールド | 値の例 |
|---|---|---|
| 投稿日時 | `created_at` | `2026-11-17T03:05:04.000Z` |
| 表示名 | `user.name` | `彩恵りり🍀科学ライター兼Vtuber (お仕事募集中)` |
| ユーザー ID | `user.screen_name` | `Science_Release` |
| 画像 URL | `mediaDetails[].media_url_https` | `https://pbs.twimg.com/media/HXS3EsUbwAABZHP.jpg`（拡張子付き） |
| 画像サイズ | `mediaDetails[].original_info`、`photos[]` | 561×580 |
| 種別 | `mediaDetails[].type` | `photo`、`video`、`animated_gif` |

ほかに `text`、`entities`、`ext_alt_text`、`possibly_sensitive`、`isEdited` も取れます。

`mediaDetails` の並び順は `/photo/N` の N と対応します。

## 制約とリスク

1. **非公式**: 仕様の変更や停止が予告なく起こりえます。
2. **公開ツイートのみ**: 鍵アカウント、年齢制限付き、削除済みのツイートは取れません。ログインしていても、DOM でしか見えないツイートがあります。
3. **CORS**: レスポンスヘッダは `Access-Control-Allow-Origin: https://platform.twitter.com` です。x.com 上の content script から `fetch` するとブロックされます。background の service worker から呼ぶ必要があります。
4. **権限の追加**: ブラウザ拡張から呼ぶ場合、`host_permissions` に `https://cdn.syndication.twimg.com/*` が必要です。既存の拡張に追加すると、更新時にユーザーへ新しい権限の確認が出て、ストア審査にも影響する可能性があります。
5. **キャッシュとレート制限**: `cache-control: max-age=60` の CDN 経由です。レート制限は公開されていません。
6. **遅延**: ダウンロードの前に応答を待つので、少し遅くなります。失敗やタイムアウト時の逃げ道が必要です。

## 同じ情報を API なしで得る方法（確認済み）

| 情報 | 代わり |
|---|---|
| 投稿日時 | Tweet ID から計算（[snowflake.md](snowflake.md)） |
| ユーザー ID、ツイート ID、画像番号 | `/photo/N` リンク |
| 表示名 | `a[href="/<user>"]` のテキスト（[display-name.md](../x-client/display-name.md)） |
| 拡張子 | `pbs.twimg.com` に HEAD を送る（[pbs-twimg-orig.md](pbs-twimg-orig.md)） |
