# ページの JavaScript の世界（MAIN world）で content script を動かす

- 確認日: 2026-11-17
- 方法: MDN の互換性データ（[mdn/browser-compat-data](https://github.com/mdn/browser-compat-data) の `webextensions/manifest/*.json` と `webextensions/api/scripting.json`）と、MDN の解説ページを読んだ。実際のブラウザでは試していない

## 2 つの世界

MDN の [content_scripts](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/content_scripts) の説明によると、次のとおりです。

- `ISOLATED`（既定）: ページと DOM は共有しますが、グローバルなスコープと使える API は別です。
- `MAIN`: ページと同じ環境です。content script 用の拡張 API（`chrome.runtime`、`chrome.storage` など）は使えません。

MDN は、`MAIN` ではページが実行中のコードを検知したり、干渉したりできると警告しています。

ページの JavaScript が DOM 要素に付けたプロパティ（React の `__reactFiber$…` など）や、ページの `window.fetch`・`XMLHttpRequest` は、`MAIN` からしか触れません（[tweet-data.md](../x-client/tweet-data.md)）。

## 対応バージョン

| 機能 | Chrome | Firefox |
|---|---|---|
| Manifest V3 | 88 | 109 |
| `host_permissions`（MV3 のみ） | 88 | 109 |
| manifest の `content_scripts[].world` | **111** | **128** |
| `scripting.registerContentScripts` | 96 | 102 |
| `RegisteredContentScript.world` | 102 | **128** |
| `RegisteredContentScript.persistAcrossSessions` | 96 | 102（105 より前は `false` だけ指定でき、指定も必須） |
| `scripting.executeScript` | 88 | 102 |
| `scripting.executeScript` の `world` | 95 | 102 |
| `ExecutionWorld.MAIN` | 102 | **128** |

- Firefox では `executeScript` の `world` 自体は 102 からありますが、`MAIN` が使えるのは 128 からです。
- MAIN world で動かす方法は 3 つ（manifest、`registerContentScripts`、`executeScript`）あり、Firefox ではどれも 128 以降です。Chrome は方法によって 102〜111 と違います。

## バージョンが足りないときの挙動（未確認）

次のことは確かめていません。

- 古いブラウザが、manifest の未知の項目（`world`）を無視して読み込むか、エラーにするか
- 古いブラウザで `registerContentScripts` に `world: 'MAIN'` を渡したとき、例外になるか、`world` を無視して isolated world で登録するか
- `scripting` 権限を追加した版に更新したとき、利用者に権限の確認が出るか

## Firefox 127 での実際（2026-11-17、ユーザーが確認）

この拡張は、`scripting.ExecutionWorld.MAIN` がなければ非対応と判定し、`registerContentScripts` は呼びません（`app/scripts/PageScriptRegistry.ts`）。Firefox 127.0.2 に一時的なアドオンとして読み込むと、非対応と判定され、設定画面のチェックボックスが無効になりました。古い Firefox で `registerContentScripts` に `world: 'MAIN'` を渡したときの挙動は、この判定で呼ぶ前に止めるので、確かめていません。

同じ日に Firefox を最新版に更新して読み込むと、対応と判定され、`registerContentScripts`（world MAIN、document_start）で登録したスクリプトで動画の保存まで動きました（ユーザーが確認。再生前・再生後のプレイヤー・写真と動画が混ざったツイート）。

## 関連

- [browser-version-share.md](browser-version-share.md)
- [tweet-data.md](../x-client/tweet-data.md)
