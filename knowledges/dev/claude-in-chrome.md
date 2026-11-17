# Claude in Chrome でログイン済みの x.com を調べる方法

- 確認日: 2026-11-17
- 環境: Windows 11、VS Code の Claude Code 拡張、Chrome 156

## 何ができるか

Claude in Chrome は Anthropic 公式の Chrome 拡張です。Claude Code から、ふだん使っている Chrome（ログイン済みのプロファイル）を操作できます。

- 新しいタブを開いてページを読む
- `javascript_tool` でページ内の JavaScript を実行し、DOM を調べる
- コンソールログとネットワークリクエストを読む

ログインしないと見られない x.com の画面（ホーム、メディアタブなど）を調べるのに使いました。

## 導入手順

1. [Chrome Web Store の Claude in Chrome](https://chromewebstore.google.com/detail/claude/fcoeoabgfenejglbffodgkkbkcdhcgfn) をインストールする。
2. 拡張のポップアップから claude.ai にログインする。Claude Code の `/status` に出る組織と同じアカウントにする。
3. Claude Code で `/chrome` を実行し、「Enabled by default」を選ぶ。拡張が見つからない場合は、Chrome を再起動して「Reconnect extension」を選ぶ。
4. **新しいセッションを開く。** 実行中のセッションには、ブラウザ操作のツールが後から入らないことがある。
5. 新しいセッションで `/mcp` を実行し、`claude-in-chrome` が connected になっていることを確かめる。

条件:

- Pro / Max / Team / Enterprise プランで、claude.ai アカウントでログインした Claude Code。API キー認証では使えない。
- WSL では使えない。Windows ネイティブなら使える。
- サイトごとに、初回は操作の許可を求められる。

公式ドキュメント: [Claude in Chrome](https://code.claude.com/docs/en/chrome.md)、[VS Code 拡張](https://code.claude.com/docs/en/vs-code.md)

## 代わりの方法

Google の Chrome DevTools MCP（`chrome-devtools-mcp`）を `--autoConnect` で使う方法もあります。設定は手作業で、Windows での手順は公式に確認できませんでした。

## 使うときの注意

- 操作中の Chrome はログイン済みなので、x.com は旧クライアントで表示されます。新クライアント（ログアウト時）を調べるには、curl か別プロファイルを使います（[logged-out-access.md](../x-client/logged-out-access.md)）。
- 画像は遅延読み込みされるので、`javascript_tool` で待ち時間とスクロールを入れてから集めます。
- ツールの出力フィルタで URL のクエリ文字列が隠されることがありました。クエリを除いて取り直すと読めます。
- `/` 区切りのパス（`/NASA/status/...` など）も `[BLOCKED: ...]` に置き換えられることがありました。`/` を空白などに置き換えて返すと読めます（2026-11-17）。
- `javascript_tool` の戻り値は、約 1,000 文字で切り詰められます（`[TRUNCATED]`）。大きなデータを持ち出すのには向きません。ページの `window` や `sessionStorage` に置いたまま、集計した結果だけを返します（2026-11-17）。
- `javascript_tool` は 45 秒で応答待ちが打ち切られます。ただし、ページ内の処理は止まらずに最後まで動きます。結果を `window` に置いておけば、次の呼び出しで読めます（2026-11-17）。
- `history.pushState` のあとに `popstate` を発火させると、ページを再読み込みせずに x.com の画面を切り替えられます。`window` に置いた変数が残るので、何画面も続けて調べるときに便利です（2026-11-17）。
- `computer` の `right_click` では、ページに `mousedown`（button 2）は届きますが、`contextmenu` イベントは届きませんでした。`javascript_tool` で `new MouseEvent('contextmenu')` を `dispatchEvent` しても、同じスクリプトで `window` に付けたリスナーさえ呼ばれません（`auxclick` や独自のイベントは呼ばれました）。Claude in Chrome の側で `contextmenu` を止めていると見られます。右クリックの挙動は、人が確かめる必要があります（2026-11-17）。
- ブラウザ標準のコンテキストメニューは、スクリーンショットに映りません。ページ内に描画されるメニュー（X 独自のメニューなど）は映ります（2026-11-17）。
- `read_network_requests` は、ページを読み込み直した直後の要求を取りこぼすことがあります。読み込み中に「pending」として見えた要求が、読み込みが終わると一覧から消えていました。`history.pushState` と `popstate` で画面を切り替えたときの要求は記録されました（2026-11-17）。
- 応答の中身を調べたいときは、`javascript_tool` でページの `XMLHttpRequest.prototype.open` / `send` と `window.fetch` を差し替えて記録し、そのあと画面を切り替えると確実です。x.com では、読み込み後に差し替えても XHR を拾えました（[tweet-data.md](../x-client/tweet-data.md)、2026-11-17）。
- `javascript_tool` のコードは、ページの JavaScript の世界で動きます。React が DOM 要素に付けた `__reactFiber$…` なども読めます。拡張の content script（isolated world）とは見え方が違うので注意してください（2026-11-17）。
- 拡張機能の管理画面（`chrome://extensions`）とシークレットウィンドウを操作できるかは試していません。2026-11-17 は、自作の拡張機能の読み込みと、右クリックしてメニューから選ぶ確認を人が行いました。
- 調査が終わったら、作業用に開いたタブを閉じます。
