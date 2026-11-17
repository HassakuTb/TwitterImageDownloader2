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
- オーバーレイの `aria-label` は UI の言語で変わります。日本語では `メディアを表示` でした（2026-11-17）。

### img とリンクの対応（2026-11-17 確認）

`img` から親を 3 つたどった要素が、`img` 1 つと `/photo/N` リンク 1 つだけを含む枠でした。次のページの SSR で、すべての画像が同じ形でした。

- `/NASA/status/2119846862286930036`（画像 4 枚）
- `/NASA/status/2121280846183137564`（画像 1 枚）
- `/NASA`（プロフィール）

プロフィールでは、`/photo/N` リンクのない `img` が 1 件ありました（旧クライアントで `previewInterstitial` の中にあった画像と同じもの。[responsive-web-dom.md](responsive-web-dom.md)）。

### 引用ツイート（2026-11-17 確認）

引用元のツイートは、外側の `<article>` の中の入れ子の `<article>` です。引用元の画像のオーバーレイは、引用元のツイートの `/<引用元>/status/<id>/photo/<n>` を指しています。引用元のユーザーの表示名のリンクも、入れ子の `article` の中にあります。

### SSR の重複と `/photo/N` の URL（2026-11-17 確認）

- ツイート詳細の SSR では、同じツイートの画像が 2 つの `article` に重複して入っていました（画像 4 枚のツイートで `img` が 8 件）。
- `/<user>/status/<id>/photo/<n>` を取得すると、ツイート詳細と同じ内容の SSR が返りました。モーダル（`[aria-modal]`、`[role=dialog]`）は含まれていません。

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
