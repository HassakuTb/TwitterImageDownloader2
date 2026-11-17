# 新クライアントで右クリックがどう扱われるか

- 確認日: 2026-11-03
- 方法: ログアウト版の SSR の HTML と vendor バンドルを読んだ
- 制約: 実際に右クリックしたときの Chrome の挙動は確認していない。以下は構造から予測したもの

## X 独自の右クリックメニュー

- 新クライアントの画像は `data-slot="xds-context-menu-trigger"` の中にあります。これは Base UI の ContextMenu のトリガーです。
- vendor バンドルで、ネイティブの `contextmenu` イベントを `preventDefault` する実装を確認しました。
- トリガーの範囲内で右クリックすると、ブラウザ標準のメニュー（拡張機能のメニューを含む）が出ない可能性があります。

## 右クリックが当たる要素（未確認の予測）

[x-web-dom.md](x-web-dom.md) のとおり、`img` の上には `<a class="absolute inset-0 z-10" href=".../photo/N">` のオーバーレイがかぶさり、`img` 側の親は `inert` です（ここまでは SSR で確認済み）。

この構造から、右クリックはオーバーレイの `<a>` に当たると予測しています。その場合、次のことが起こる見込みです。

- Chrome は **link コンテキスト**として扱い、`info.linkUrl` だけを渡す。`info.srcUrl` は来ない。
- `contexts: ['image']` だけで登録したメニュー項目は表示されない。
- オーバーレイの `<a>` は ContextMenu トリガーの外側の兄弟なので、X 独自メニューに横取りされない可能性が高い。

ログイン時の新クライアントが配信されるようになったら、実際に右クリックして確かめる必要があります。

## 旧クライアントとの違い（確認済み）

- 旧クライアントでは `img` が `/photo/N` の `<a>` の**中**にあります（[responsive-web-dom.md](responsive-web-dom.md)）。
- 新クライアントでは `img` と `<a>` が**兄弟**です。`img` から `closest('a')` でリンクにたどり着けません。

## 関係する Chrome 拡張 API の仕様

`chrome.contextMenus` の仕様（Chrome のドキュメントによる）です。

- メニューを出すコンテキストは `contexts` で指定する。`image` は画像の上、`link` はリンクの上で右クリックしたときに出る。
- `image` のときは `info.srcUrl`、`link` のときは `info.linkUrl` に URL が入る。
- `targetUrlPatterns` で、`srcUrl` や `linkUrl` の URL パターンを絞り込める。
- `onClicked` には、右クリックされた DOM 要素そのものは渡されない。要素を知るには、content script で `contextmenu` イベントの `event.target` を受ける必要がある。

## 外部の情報

- 他の拡張の対応例: [twitter-click-and-save](https://github.com/AlttiRi/twitter-click-and-save)、[TwitterMediaHarvest Issue #382](https://github.com/EltonChou/TwitterMediaHarvest/issues/382)
- X が UI にボタンを注入する拡張（Media Harvest など）をブロックしているという報告があります（[IndieKings](https://www.indiekings.com/2026/03/twitterx-privacy-extension-error-fix.html)、伝聞）。UI を注入せず DOM を読むだけの拡張なら、影響は小さいと見ています。
