# 表示名の取り方と絵文字の扱い

- 確認日: 2026-11-17
- 方法: 旧クライアントは Claude in Chrome（ログイン済み）、新クライアントはログアウト版の SSR を curl で取得

## 取り方

| クライアント | 画面 | 取り方 |
|---|---|---|
| 旧 | タイムライン、ツイート詳細 | `article` 内の `[data-testid=User-Name]` の最初の `span` |
| 旧 | メディアタブ | `main` 内の `[data-testid=UserName]` の最初の `span` |
| 旧 | ライトボックス | `body` 内の `a[href="/<user>"]` のうち、テキストが `@<user>` で始まらないもの |
| 新 | ツイート詳細、プロフィール | `article` 内の `a[href="/<user>"]` のうち、テキストを持ち `@` で始まらないもの |

`a[href="/<user>"]` を使う方法は、旧・新のどちらでも使えます。新クライアントでは `data-testid` がないので、この方法しか使えません。

新クライアントの `article` 内の `a[href="/<user>"]` は 3 つあります。

1. アイコン（`<img alt="@<user>">`、テキストなし）
2. 表示名（`<div dir="auto">表示名</div>`）
3. `@<user>`

## 絵文字の扱い

表示名に絵文字があるとき、取れるテキストがクライアントによって違います。

- **旧クライアント**: 絵文字は `<img>` で描画されるので、`span` のテキストからは消えます。
- **新クライアント**: 絵文字はテキストのまま `<div dir="auto">` に入っています。
- **syndication API**: `user.name` に絵文字が残ります。

例: `彩恵りり🍀科学ライター兼Vtuber (お仕事募集中)`（@Science_Release）

- 旧クライアントの DOM: `彩恵りり科学ライター兼Vtuber (お仕事募集中)`
- 新クライアントの DOM と syndication API: `彩恵りり🍀科学ライター兼Vtuber (お仕事募集中)`

同じアカウントでも、旧クライアントと新クライアントで `textContent` の結果が変わります。

## 関連

- [responsive-web-dom.md](responsive-web-dom.md)
- [x-web-dom.md](x-web-dom.md)
- [syndication-api.md](../media/syndication-api.md)
