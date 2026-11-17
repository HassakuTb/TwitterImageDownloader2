# 旧クライアントと新クライアントの配信状況

- 確認日: 2026-11-03（curl、ログアウト）、2026-11-17（Claude in Chrome、ログイン済み）

## 結論

X は Web クライアントを 2 つ並行して配信しています。

| 状態 | 配信されるクライアント | 確認方法 |
|---|---|---|
| ログアウト | 新クライアント **x-web** | curl（2026-11-03、2026-11-17） |
| ログイン済み | 旧クライアント **responsive-web** | Claude in Chrome（2026-11-17） |

ログアウト時はすでに新クライアントなので、ログイン時もいずれ切り替わると見込んでいます。時期はわかりません。

## 見分け方

ページの HTML が読み込むスクリプトの URL で判別できます。

- 新クライアント: `abs.twimg.com/x-web/x-web/entry-client-*.js`
- 旧クライアント: `abs.twimg.com/responsive-web/client-web/*`

ログイン済みの HTML にも `x-web` という文字列は出てきます。ただしこれは xchat（DM）の埋め込み URL です。`x-web` が含まれるかどうかだけで判定すると誤ります。

ログアウト時の `/home` はトップページ（ランディング）に飛ばされ、その HTML には `x-web` と `responsive-web` の両方が含まれていました。

## 新クライアントの技術構成

vendor バンドルから読み取った構成です。

- TanStack Router
- Tailwind CSS
- React 19
- Base UI（右クリックメニューに使用。[context-menu.md](context-menu.md) を参照）

## 外部の情報

- 第三者の報告によると、X は 2026 年 7 月から完全に書き直したクライアントへの移行を始めています。
- 2026-10 中旬の時点で、ログイン済みでは旧クライアントと新クライアントが併存しているという報告がありました。2026-11-17 に私たちのアカウントで確認したときは旧クライアントでした。
- 参考: [Jane Manchun Wong の報告](https://x.com/wongmjane/status/2073141434484666724)、[go-twitter Issue #119](https://github.com/anatolykoptev/go-twitter/issues/119)、[bird PR #25](https://github.com/fightingentropy/bird/pull/25)

## 関連

- [responsive-web-dom.md](responsive-web-dom.md)
- [x-web-dom.md](x-web-dom.md)
- [logged-out-access.md](logged-out-access.md)
