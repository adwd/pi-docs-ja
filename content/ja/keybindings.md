# キーバインドリファレンス

Pi では、`app.session.new` などの名前付きアクションが公開されており、キーバインドを割り当てられます。Pi の[ユーザー設定](configuration.md#agent-directory)で、デフォルトの割り当てを変更したり、未割り当てのアクションにキーを割り当てたりできます。

`/hotkeys` を実行すると、メインエディターとアプリケーションで現在有効なショートカットを確認できます。

## キーバインドの割り当て

`<agent-dir>/keybindings.json` を作成します。エージェントディレクトリのデフォルトは `~/.pi/agent` で、[エージェントディレクトリ](configuration.md#agent-directory)で説明されています。

各アクション識別子を、1 つのキーまたはキーのリストにマッピングします。

```json
{
  "app.session.new": "ctrl+shift+n",
  "app.session.tree": ["ctrl+shift+t", "alt+shift+t"]
}
```

設定した値は、そのアクションのデフォルト値を置き換えます。アクションのキーバインドを無効にするには、空のリストを使用します。

```json
{
  "tui.altScreen.pageUp": []
}
```

ファイルを編集した後、`/reload` を実行して、変更をアクティブなセッションに適用します。

## キー構文

キーは `modifier+key` の形式で記述します。修飾キーは `ctrl`、`shift`、`alt`、`super` です。修飾キーは組み合わせられます。有効なキーは次のとおりです。

- **英字:** `a-z`
- **数字:** `0-9`
- **特殊キー:** `escape`、`esc`、`enter`、`return`、`tab`、`space`、`backspace`、`delete`、`insert`、`clear`、`home`、`end`、`pageUp`、`pageDown`、`up`、`down`、`left`、`right`
- **ファンクションキー:** `f1`～`f12`
- **記号:** `` ` ``、`-`、`=`、`[`、`]`、`\`、`;`、`'`、`,`、`.`、`/`、`!`、`@`、`#`、`$`、`%`、`^`、`&`、`*`、`(`、`)`、`_`、`+`、`|`、`~`、`{`、`}`、`:`、`<`、`>`、`?`

例: `ctrl+shift+x`、`alt+ctrl+x`、`ctrl+shift+alt+x`、`super+k`、`ctrl+super+k`、`ctrl+1`。

`super` のキーバインドには、通常は Kitty キーボードプロトコルを介して、修飾キーを個別に報告するターミナルが必要です。そのサポートがないターミナルでは動作しない場合があります。

## アクション

### ターミナル UI

#### カーソル移動

| キーバインド ID | デフォルト | 説明 |
|---|---|---|
| `tui.editor.cursorUp` | `up` | カーソルを上に移動し、先頭では古い履歴を参照します |
| `tui.editor.cursorDown` | `down` | カーソルを下に移動し、末尾では新しい履歴を参照します |
| `tui.editor.historyPrevious` | なし | プロンプト履歴の前のエントリを選択します |
| `tui.editor.historyNext` | なし | プロンプト履歴の次のエントリを選択します |
| `tui.editor.cursorLeft` | `left`、`ctrl+b` | カーソルを左に移動します |
| `tui.editor.cursorRight` | `right`、`ctrl+f` | カーソルを右に移動します |
| `tui.editor.cursorWordLeft` | `alt+left`、`ctrl+left`、`alt+b` | カーソルを 1 単語左に移動します |
| `tui.editor.cursorWordRight` | `alt+right`、`ctrl+right`、`alt+f` | カーソルを 1 単語右に移動します |
| `tui.editor.cursorLineStart` | `home`、`ctrl+home`、`ctrl+a` | 行頭に移動します |
| `tui.editor.cursorLineEnd` | `end`、`ctrl+end`、`ctrl+e` | 行末に移動します |
| `tui.editor.jumpForward` | `ctrl+]` | 指定した文字へ前方にジャンプします |
| `tui.editor.jumpBackward` | `ctrl+alt+]` | 指定した文字へ後方にジャンプします |
| `tui.editor.pageUp` | `pageUp`、`ctrl+pageUp` | 1 ページ上にスクロールします |
| `tui.editor.pageDown` | `pageDown`、`ctrl+pageDown` | 1 ページ下にスクロールします |

専用の履歴アクションは、カーソル位置に関係なくプロンプト履歴を参照し、同じキーを使用するアプリケーションアクションより優先されます。

#### テキスト編集

| キーバインド ID | デフォルト | 説明 |
|---|---|---|
| `tui.editor.deleteCharBackward` | `backspace` | 前の文字を削除します |
| `tui.editor.deleteCharForward` | `delete`、`ctrl+d` | 次の文字を削除します |
| `tui.editor.deleteWordBackward` | `ctrl+w`、`alt+backspace` | 前の単語を削除します |
| `tui.editor.deleteWordForward` | `alt+d`、`alt+delete` | 次の単語を削除します |
| `tui.editor.deleteToLineStart` | `ctrl+u` | 行頭まで削除します |
| `tui.editor.deleteToLineEnd` | `ctrl+k` | 行末まで削除します |
| `tui.editor.yank` | `ctrl+y` | 最後に削除したテキストを貼り付けます |
| `tui.editor.yankPop` | `alt+y` | ヤンク後に削除済みテキストを順に切り替えます |
| `tui.editor.undo` | `ctrl+-`（Windows では `ctrl+z`、WSL では `alt+z`） | 直前の編集を元に戻します |

#### 入力と選択

| キーバインド ID | デフォルト | 説明 |
|---|---|---|
| `tui.input.newLine` | `shift+enter`、`ctrl+j` | 改行を挿入します |
| `tui.input.submit` | `enter` | 入力を送信します |
| `tui.input.tab` | `tab` | タブを入力するか、自動補完します |
| `tui.input.copy` | `ctrl+c` | 選択範囲をコピーします |
| `tui.select.up` | `up` | 選択位置を上に移動します |
| `tui.select.down` | `down` | 選択位置を下に移動します |
| `tui.select.pageUp` | `pageUp` | リスト内で 1 ページ上に移動します |
| `tui.select.pageDown` | `pageDown` | リスト内で 1 ページ下に移動します |
| `tui.select.confirm` | `enter` | 選択を確定します |
| `tui.select.cancel` | `escape`、`ctrl+c` | 選択をキャンセルします |

#### フルスクリーン

フルスクリーンモードでは、これらのアクションがトランスクリプトを制御し、同じキーを使用するエディターアクションより優先されます。

| キーバインド ID | デフォルト | 説明 |
|---|---|---|
| `tui.altScreen.pageUp` | `pageUp` | トランスクリプトを 1 ページ上にスクロールします |
| `tui.altScreen.pageDown` | `pageDown` | トランスクリプトを 1 ページ下にスクロールします |
| `tui.altScreen.halfPageUp` | なし | トランスクリプトを半ページ上にスクロールします |
| `tui.altScreen.halfPageDown` | なし | トランスクリプトを半ページ下にスクロールします |
| `tui.altScreen.lineUp` | なし | トランスクリプトを 1 行上にスクロールします |
| `tui.altScreen.lineDown` | なし | トランスクリプトを 1 行下にスクロールします |
| `tui.altScreen.previousPrompt` | `ctrl+shift+up`、`ctrl+up`（Windows と WSL では `ctrl+up` のみ） | 前のマーク付きメッセージにジャンプします |
| `tui.altScreen.nextPrompt` | `ctrl+shift+down`、`ctrl+down`（Windows と WSL では `ctrl+down` のみ） | 次のマーク付きメッセージにジャンプします |
| `tui.altScreen.search` | `ctrl+shift+f`（Windows と WSL では `ctrl+f`） | レンダリングされたトランスクリプトを検索します |
| `tui.altScreen.searchNext` | `enter`、`ctrl+g` | 検索中に次の一致項目を選択します |
| `tui.altScreen.searchPrevious` | `shift+enter`、`ctrl+shift+g` | 検索中に前の一致項目を選択します |
| `tui.altScreen.searchClose` | `escape` | トランスクリプト検索を閉じます |
| `tui.altScreen.top` | `home` | トランスクリプトの先頭までスクロールします |
| `tui.altScreen.bottom` | `end` | トランスクリプトの末尾までスクロールし、新しい出力を追尾します |

### アプリケーション

| キーバインド ID | デフォルト | 説明 |
|--------|---------|-------------|
| `app.interrupt` | `escape` | キャンセル / 中止 |
| `app.clear` | `ctrl+c` | エディターをクリア（1 回目）/ 終了（2 回目） |
| `app.exit` | `ctrl+d` | 終了（エディターが空の場合） |
| `app.suspend` | `ctrl+z`（Windows ではなし） | バックグラウンドに一時停止 |
| `app.editor.external` | `ctrl+g` | 外部エディターで開く（`externalEditor`、`$VISUAL`、`$EDITOR`、Windows ではメモ帳、それ以外では `nano`） |
| `app.clipboard.pasteImage` | `ctrl+v`（Windows および WSL では `alt+v`） | macOS ではファイルを、またはクリップボードから画像やテキストを貼り付ける |

ネイティブ Windows では、Windows ターミナルが Unix のジョブ制御をサポートしていないため、`app.suspend` にデフォルトはありません。手動で割り当てた場合、Pi はサスペンドする代わりにステータスメッセージを表示します。WSL では通常どおり `ctrl+z` と `fg` を使用できます。

### セッション

| キーバインド ID | デフォルト | 説明 |
|--------|---------|-------------|
| `app.session.new` | なし | 新しいセッションを開始します（`/new`） |
| `app.session.tree` | なし | セッションツリーナビゲーターを開きます（`/tree`） |
| `app.session.fork` | なし | 現在のセッションをフォークします（`/fork`） |
| `app.session.resume` | なし | セッション再開ピッカーを開きます（`/resume`） |
| `app.session.togglePath` | `ctrl+p` | パス表示を切り替えます |
| `app.session.toggleSort` | `ctrl+s` | 並べ替えモードを切り替えます |
| `app.session.toggleNamedFilter` | `ctrl+n` | 名前付き項目のみのフィルターを切り替えます |
| `app.session.rename` | `ctrl+r` | セッション名を変更します |
| `app.session.delete` | `ctrl+d` | セッションを削除します |
| `app.session.deleteNoninvasive` | `ctrl+backspace` | クエリが空の場合にセッションを削除します |

### モデルと思考

| キーバインド ID | デフォルト | 説明 |
|--------|---------|-------------|
| `app.model.select` | `ctrl+l` | モデルセレクターを開きます |
| `app.model.cycleForward` | `ctrl+p` | 次のモデルに切り替えます |
| `app.model.cycleBackward` | `shift+ctrl+p`（Windows と WSL では `alt+p`） | 前のモデルに切り替えます |
| `app.models.save` | `ctrl+s` | 選択したデフォルトモデルまたはスコープ付きモデル設定を設定に保存します |
| `app.thinking.cycle` | `shift+tab` | 思考レベルを切り替えます |
| `app.thinking.save` | `ctrl+s` | 現在の思考レベルを設定に保存します |
| `app.thinking.toggle` | `ctrl+t` | 思考ブロックを折りたたむか展開します |

### 表示とメッセージキュー

| キーバインド ID | デフォルト | 説明 |
|--------|---------|-------------|
| `app.tools.expand` | `ctrl+o` | ツール出力を折りたたむか展開します |
| `app.message.copy` | `ctrl+x` | `/tree` では選択したメッセージをコピーします。フルスクリーンモードでは、`fullscreenCopyOnSelect` が `false` の場合にアクティブな選択範囲をコピーします。それ以外の場合は、最後のアシスタントメッセージをコピーします |
| `app.message.followUp` | `alt+enter`（Windows と WSL では `ctrl+q`） | フォローアップメッセージをキューに追加します |
| `app.message.dequeue` | `alt+up`（Windows と WSL では `alt+q`） | キュー内のメッセージをエディターに戻します |

### ツリーナビゲーション

| キーバインド ID | デフォルト | 説明 |
|--------|---------|-------------|
| `app.tree.foldOrUp` | `ctrl+left`、`alt+left` | 現在の分岐セグメントを折りたたむか、前のセグメントの開始位置にジャンプします |
| `app.tree.unfoldOrDown` | `ctrl+right`、`alt+right` | 現在の分岐セグメントを展開するか、次のセグメントの開始位置または分岐の末尾にジャンプします |
| `app.tree.editLabel` | `shift+l` | 選択したツリーノードのラベルを編集します |
| `app.tree.toggleLabelTimestamp` | `shift+t` | ツリー内のラベルのタイムスタンプ表示を切り替えます |
| `app.tree.filter.default` | `ctrl+d` | ツリーフィルターをデフォルト表示に設定します |
| `app.tree.filter.noTools` | `ctrl+t` | ツール結果を非表示にするツリーフィルターを切り替えます |
| `app.tree.filter.userOnly` | `ctrl+u` | ユーザーメッセージのみを表示するツリーフィルターを切り替えます |
| `app.tree.filter.labeledOnly` | `ctrl+l` | ラベル付きエントリのみを表示するツリーフィルターを切り替えます |
| `app.tree.filter.all` | `ctrl+a` | すべてのエントリを表示するツリーフィルターを切り替えます |
| `app.tree.filter.cycleForward` | `ctrl+o` | ツリーフィルターを順方向に切り替えます |
| `app.tree.filter.cycleBackward` | `shift+ctrl+o` | ツリーフィルターを逆方向に切り替えます |

### スコープ付きモデルセレクター

スコープ対象モデルセレクター（`/scoped-models` で開きます）内で使用します。

| キーバインド ID | デフォルト | 説明 |
|--------|---------|-------------|
| `app.models.enableAll` | `ctrl+a` | すべてのモデル（または現在の検索に一致するすべてのモデル）を有効にする |
| `app.models.clearAll` | `ctrl+x` | すべてのモデル（または現在の検索に一致するすべてのモデル）をクリアする |
| `app.models.toggleProvider` | `ctrl+p` | 現在のプロバイダーのすべてのモデルを切り替える |
| `app.models.reorderUp` | `alt+up` | 選択したモデルを循環順で上に移動する |
| `app.models.reorderDown` | `alt+down` | 選択したモデルを循環順で下に移動する |
