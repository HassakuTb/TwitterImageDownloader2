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

## ライトボックス

- 画像は `[aria-modal=true]` の中にあります。
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
