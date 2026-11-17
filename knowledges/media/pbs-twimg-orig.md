# pbs.twimg.com の原寸画像 URL と format の挙動

- 確認日: 2026-11-03、2026-11-17
- 方法: curl（認証なし、Referer なし）

## 原寸画像の URL

```
https://pbs.twimg.com/media/<mediaId>?format=<jpg|png>&name=orig
```

- 認証も Referer もなしで取得できます。
- レスポンスヘッダに `access-control-allow-origin: *` があります。拡張機能の background やほかのオリジンからも `fetch` で HEAD を送れます。

## format は原本と一致しないと 404

`name=orig` のときは、`format` が原本の形式と同じ場合だけ 200 が返ります。違う形式を指定すると 404 です。`webp` は原本が何でも 404 でした。

2026-11-17 の結果:

| mediaId | 原本 | `format=png` | `format=jpg` | `format=webp` |
|---|---|---|---|---|
| `HXTp9UMaYAAd0qG` | PNG | 200 `image/png` 16662B | 404 | 404 |
| `HXS3EsUbwAABZHP` | JPEG | 404 | 200 `image/jpeg` 98274B | 404 |

HEAD リクエストでも同じ結果（原本が JPEG の画像に `format=png` で 404）でした。

## DOM から原本の形式がわかるか

- **旧クライアント**: `img` の src が `format=jpg` か `format=png` で、原本の形式が出ていると見られます。
- **新クライアント**: src が `format=webp&name=large` なので、DOM からはわかりません。

上の表のとおり、原本の形式でだけ 200 が返るので、`format=jpg` と `format=png` に HEAD を送れば原本の形式がわかります。syndication API の `media_url_https` も拡張子付きなので、そこからもわかります（[syndication-api.md](syndication-api.md)）。

## PNG の画像を探すコツ

ログイン時のホームで集めた画像 56 件は、すべて JPEG でした。PNG の原本は、ドット絵の検索（`ドット絵 filter:images`、最新順）で見つかりました。

## 関連

- [responsive-web-dom.md](../x-client/responsive-web-dom.md)
- [x-web-dom.md](../x-client/x-web-dom.md)
