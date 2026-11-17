# 画像を右クリックしたときの X 独自メニュー

- 確認日: 2026-11-03、2026-11-17
- 方法:
  - 2026-11-03: ログアウト版の SSR の HTML と vendor バンドルを読んだ
  - 2026-11-17: Claude in Chrome でログイン済みの x.com（旧クライアント）を右クリックした。あわせて、拡張機能を入れた Chrome でユーザーが手で確認した（旧クライアントと、シークレットウィンドウのログアウト状態の x-web）

## 旧クライアントでも X 独自のメニューが出る（2026-11-17 確認）

ログイン済み（旧クライアント）の `/NASA/status/2119846862286930036` で画像を右クリックすると、ページ内に「写真リンクをコピー」だけの X 独自メニューが出ました。

- `window` の bubble フェーズで受けた `contextmenu` は `defaultPrevented: true`、`target` は `IMG` でした。ページがイベントをキャンセルしているので、ブラウザ標準のメニュー（拡張機能のメニューを含む）は出ません。
- このページに `[data-slot*="context-menu"]` は 0 件でした。x-web の Base UI のトリガーとは別の仕組みです。
- 2026-11-17 以前から使えなくなっていたのかは不明です。少なくともこの日には、拡張機能のメニューから画像を保存できない状態でした。

### イベントを先に止めると標準のメニューが出る

`window` に capture フェーズで `contextmenu` のリスナーを付け、画像の上なら `event.stopImmediatePropagation()` を呼ぶ（`preventDefault` は呼ばない）と、次のようになりました。

- X 独自のメニューは出なくなりました。イベントは `document` にも届きません（Claude in Chrome で確認）。
- ブラウザ標準のメニューが出て、拡張機能のメニューから保存できました（ユーザーが手で確認。旧クライアントと x-web の両方）。

`window` の capture フェーズは、イベントが最初に届く場所です。X のリスナーより先に登録しておけば、X のリスナーは呼ばれません。content script を `document_start` で読み込めば、ページのスクリプトより先に登録できます。

ブラウザ標準のコンテキストメニューは、Claude in Chrome のスクリーンショットに映りません（[claude-in-chrome.md](../dev/claude-in-chrome.md)）。標準のメニューが出るかどうかは、人が確かめる必要があります。

## 新クライアントの X 独自メニュー（2026-11-03、構造から読んだもの）

- 新クライアントの画像は `data-slot="xds-context-menu-trigger"` の中にあります。これは Base UI の ContextMenu のトリガーです。
- vendor バンドルで、ネイティブの `contextmenu` イベントを `preventDefault` する実装を確認しました。
- トリガーの範囲内で右クリックすると、ブラウザ標準のメニュー（拡張機能のメニューを含む）が出ない可能性があります。

## 右クリックが当たる要素（未確認の予測）

[x-web-dom.md](x-web-dom.md) のとおり、`img` の上には `<a class="absolute inset-0 z-10" href=".../photo/N">` のオーバーレイがかぶさり、`img` 側の親は `inert` です（ここまでは SSR で確認済み）。

この構造から、右クリックはオーバーレイの `<a>` に当たると予測しています。その場合、次のことが起こる見込みです。

- Chrome は **link コンテキスト**として扱い、`info.linkUrl` だけを渡す。`info.srcUrl` は来ない。
- `contexts: ['image']` だけで登録したメニュー項目は表示されない。
- オーバーレイの `<a>` は ContextMenu トリガーの外側の兄弟なので、X 独自メニューに横取りされない可能性が高い。

2026-11-17 追記: 旧クライアントでは X 独自メニューが出ることを確認しました（上記）。x-web で右クリックがどの要素に当たるか、X 独自メニューが出るかは、まだ DOM で確認していません。ただし、上記の方法でイベントを止めると、x-web でも拡張機能のメニューから保存できました（ユーザーが手で確認）。ログイン時の新クライアントでは確認できていません。

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
