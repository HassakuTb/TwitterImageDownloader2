# 新クライアント（x-web）の画像まわりの DOM

- 確認日: 2026-11-03、2026-11-17
- 方法: ログアウト状態で x.com のツイート詳細とプロフィールを curl で取得し、サーバー描画（SSR）の HTML を解析した
- 制約: ブラウザで JavaScript が動いた後の DOM と、ログイン時の新クライアントの DOM は確認していない

## 旧クライアントとの違い

- `data-testid` が **0 件**です。`[data-testid=User-Name]` などは使えません。
- `<time datetime>` がありません。投稿日時は `<a href="/<user>/status/<id>">Oct 30</a>` のような表示用テキストしかありません。
- ツイートは `<article class="flex flex-col gap-1">` です。
- `/photo/N` へのリンクは `img` の**祖先ではありません**。`img.closest('a')` では取れません。

## 画像のマークアップ

```html
<div inert>
  <div data-slot="xds-context-menu-trigger">
    <img src="https://pbs.twimg.com/media/<id>?format=webp&name=large" srcset="...">
  </div>
</div>
<a aria-label="View media" class="absolute inset-0 z-10"
   href="/<user>/status/<id>/photo/<n>"></a>
```

- `img` は `inert` の `div` の中にあります。
- `/photo/N` へのリンクは、兄弟要素のオーバーレイ `<a>` です。`absolute inset-0 z-10` で画像全体を覆っています。
- `/photo/N` リンクと `img` は同じ枠の中にあります。リンクの親コンテナから `img[src*="pbs.twimg.com/media/"]` を探せば、画像を特定できます。
- `img` の src は `format=webp` です。原本の形式は DOM からわかりません。

## 表示名

`article` 内に `a[href="/<user>"]` が 3 つあります。

1. アイコン（`<img alt="@<user>">`）
2. 表示名（`<div dir="auto">表示名</div>`）
3. `@<user>`

テキストを持ち、`@` で始まらないものが表示名です。詳しくは [display-name.md](display-name.md) を参照してください。

## 件数の例

2026-11-17 に `/Science_Release/status/2122526407998017996` を取得したときの件数です。

- `article`: 6 件
- `pbs.twimg.com/media` の画像: 31 件
- `/photo/N` リンク: 9 件

## 関連

- [client-versions.md](client-versions.md)
- [context-menu.md](context-menu.md)
- [logged-out-access.md](logged-out-access.md)
