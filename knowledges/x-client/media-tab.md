# メディアタブが「動画 / 画像」に分かれた件

- 確認日: 2026-11-17
- 方法: Claude in Chrome でログイン済みの x.com を操作した（旧クライアント）

## 変更の内容

プロフィールのメディアタブが「動画 ⌄」のドロップダウンになりました。開くと「動画」と「画像」を選べます。

| URL | 内容 |
|---|---|
| `/<user>/media` | 動画の一覧（グリッドではなくツイート一覧の形） |
| `/<user>/media?filter=photo` | 画像のグリッド |

## 画像グリッドの DOM

- `img.closest('a')` で `/<user>/status/<id>/photo/<n>` に届きます。
- `main` 内に `[data-testid=UserName]` があり、表示名を取れます。
- 画像は `article` の中にありません。タイムラインと同じ方法（`img.closest('article')`）では、ツイートの枠を見つけられません。
- 表示名を持つ `a[href="/<user>"]` はありません。ページの title（`NASA（@NASA）さんの画像 / X` など）には表示名と `@<user>` が入っています（[display-name.md](display-name.md)）。
- `@NASA` では、グリッドに `img` が 19〜34 件ありました（スクロール量による）。どれも `img.closest('a')` で `/photo/N` に届きました（2026-11-17）。

## 注意点

- `/<user>/media` は画像の一覧ではなくなりました。画像の一覧を開くには `?filter=photo` が必要です。
- ページの URL で画面を判定する場合、パスを `/` で区切って比べるだけだと `media?filter=photo` を見落とします。クエリ文字列と末尾の `/` を除いてから比べる必要があります。

## 新クライアントでの状態

ログアウト状態ではメディアタブを開けない（ログイン画面に飛ばされる）ので、新クライアント版の DOM は確認できていません（[logged-out-access.md](logged-out-access.md)）。

## 関連

- [responsive-web-dom.md](responsive-web-dom.md)
