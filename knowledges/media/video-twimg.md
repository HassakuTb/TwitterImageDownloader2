# 動画と GIF の配信（video.twimg.com）

- 確認日: 2026-11-17
- 方法: ログアウト状態の x.com を curl で取得し、ページに埋め込まれたデータ（[tweet-data.md](../x-client/tweet-data.md)）から URL を取り出した。その URL を、認証なし・Referer なしの curl で取得した
- 例に使ったもの:
  - 動画: `/NASA/status/2122404409292337592`（メディアの数値 ID `2122404339197030400`、63.5 秒、縦長）
  - GIF: `@GIPHY` のプロフィールにあった GIF（キー `Gyvn5n8X0AAXK24`）

## URL の形

| 種類 | URL |
|---|---|
| 動画の mp4 | `https://video.twimg.com/amplify_video/<数値ID>/vid/avc1/<幅>x<高さ>/<ハッシュ>.mp4?tag=16` |
| 動画の HLS | `https://video.twimg.com/amplify_video/<数値ID>/pl/<ハッシュ>.m3u8?tag=16&v=7d7` |
| GIF の mp4 | `https://video.twimg.com/tweet_video/<キー>.mp4` |

- `<ハッシュ>` は画質ごとに違い、同じ画質でも mp4 と m3u8 で違いました（1080×1920 の mp4 は `oWohfiQdHBKfiUHX`、m3u8 は `sLU93c8DBAgdwV4t`）。ほかの情報から計算する方法は見つかっていません。URL はデータから取る必要があります。
- 他の資料では `ext_tw_video/…` で始まる形もあるとされていますが、今回は見ていません（未確認）。

## 画質の種類（variants）

1 本の動画に、画質違いの mp4 が何本かと、HLS の m3u8 が 1 本あります。NASA の動画の例です。

| content_type | bitrate | 解像度 |
|---|---|---|
| `application/x-mpegURL` | （なし） | — |
| `video/mp4` | 632000 | 320×568 |
| `video/mp4` | 950000 | 480×852 |
| `video/mp4` | 2176000 | 720×1280 |
| `video/mp4` | 10368000 | 1080×1920 |

- m3u8 には `bitrate` がありません。
- 解像度は URL のパス（`/avc1/<幅>x<高さ>/`）にも入っています。

## 取得できるか

1080×1920 の mp4 を取得した結果です。

- 認証も Referer もなしで **200** でした。
- `content-type: video/mp4`、`content-length: 7881355`（約 7.9MB）
- `access-control-allow-origin: *`。ほかのオリジンからも `fetch` できます。
- `cache-control: max-age=604800, must-revalidate`
- `?tag=16` を外しても、同じサイズで 200 でした。

鍵アカウントの動画の mp4 も認証なしで取れるかは、確かめていません（未確認）。

## HLS（m3u8）の中身

マスタープレイリストに入っていたものです。

- 字幕（`TYPE=SUBTITLES`）
- 音声のストリーム 3 本（`mp4a` の 32000 / 64000 / 128000）
- 映像のストリーム 4 本（`avc1`。mp4 と同じ 4 つの解像度）

音声と映像が別々のストリームです。1 本の mp4 にするには、つなぎ合わせる処理が必要です。プレイリストの中の URL は、`/amplify_video/…` で始まる相対パスでした。

## GIF の実体は mp4

X の「GIF」には GIF ファイルがありません。mp4 だけです。

| URL | 結果 |
|---|---|
| `video.twimg.com/tweet_video/<キー>.mp4` | **200**（`video/mp4`、43,468 バイト） |
| `video.twimg.com/tweet_video/<キー>.gif` | 404 |
| `pbs.twimg.com/tweet_video/<キー>.gif` | 404 |
| `pbs.twimg.com/media/<キー>?format=gif&name=orig` | 404 |
| `pbs.twimg.com/tweet_video_thumb/<キー>?format=gif&name=orig` | 404 |
| `pbs.twimg.com/tweet_video_thumb/<キー>.jpg`（poster） | 200（`image/jpeg`） |

- データの上では `type: "animated_gif"` で、variants は `bitrate: 0` の `video/mp4` が 1 本だけでした。
- poster のキーと mp4 のファイル名は、同じキー（`Gyvn5n8X0AAXK24`）でした。
- アップロードされた元の GIF は、X には残っていないと見られます。

## poster（再生前に表示される静止画）の形

| 形 | 見た場所 |
|---|---|
| `pbs.twimg.com/media/<mediaId>` | NASA の動画。画像と同じ形なので、URL だけでは画像と区別できない |
| `pbs.twimg.com/amplify_video_thumb/<数値ID>/img/<キー>` | `@GIPHY` のプロフィールにあった別の動画 |
| `pbs.twimg.com/tweet_video_thumb/<キー>` | GIF |

## データの中のメディア

ページが受け取るツイートのデータ（GraphQL の応答）で、動画のメディアは次のフィールドを持っていました。

| フィールド | NASA の動画の値 |
|---|---|
| `type` | `video`（GIF は `animated_gif`、画像は `photo`） |
| `id_str` | `2122404339197030400`（URL の `<数値ID>` と同じ） |
| `media_url_https` | `https://pbs.twimg.com/media/HXRLj6bW0AAxO8n.jpg`（poster） |
| `original_info` | `{ height: 720, width: 405 }` |
| `video_info.duration_millis` | `63533` |
| `video_info.variants` | 上の「画質の種類」の表 |

`media_url_https` は、ページに表示される poster と同じ ID です。ページ上の poster とデータの中のメディアを、これで対応づけられます。

データをどこから得られるかは、[tweet-data.md](../x-client/tweet-data.md) を参照してください。

## 関連

- [pbs-twimg-orig.md](pbs-twimg-orig.md)
- [syndication-api.md](syndication-api.md)（`mediaDetails[].type` にも同じ種別がある）
