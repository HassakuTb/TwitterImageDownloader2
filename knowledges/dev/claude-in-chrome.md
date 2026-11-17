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
- 調査が終わったら、作業用に開いたタブを閉じます。
