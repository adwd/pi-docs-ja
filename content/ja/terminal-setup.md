# ターミナルを設定する

最新のターミナルの多くは、追加設定なしで Pi を使用できます。修飾キー、スクロール、リンク、画像、色、または入力メソッドエディター（IME）の位置が想定どおりに動作しない場合は、このページを参照してください。

Pi は拡張キープロトコルを使用するため、ターミナルは `Shift+Enter` や `Alt+Enter` などの組み合わせを通常の `Enter` と区別できます。ターミナルプロキシ、マルチプレクサー、IDE 内蔵ターミナルによって、この情報が変更または破棄されることがあります。

## トラブルシューティング

| 症状 | 最初に参照する箇所 |
|---|---|
| `Shift+Enter` で改行が挿入されず送信される | 以下にある使用中のターミナルのセクション。tmux の場合は [tmux で Pi を実行する](tmux.md) |
| `Alt+Enter` でフォローアップがキューに追加されない | [WezTerm](#wezterm)、[Alacritty](#alacritty)、または [Windows Terminal](#windows-terminal) |
| フルスクリーンでのスクロールが異常に遅い | [iTerm2](#iterm2) |
| リンクは機能するが、ホバープレビューが表示されない | [Ghostty](#ghostty) |
| インライン画像または色が検出されない | [検出された機能を上書きする](#override-detected-capabilities) |
| IME の候補ウィンドウが誤った位置に表示される | [WezTerm](#wezterm) または [IntelliJ IDEA](#intellij-idea-integrated-terminal) |
| tmux 内でのみ修飾キーが機能しない | [tmux で Pi を実行する](tmux.md) |

Pi で有効なショートカットを確認するには、`/hotkeys` を使用します。変更方法については、[キーバインド](keybindings.md)を参照してください。

## Kitty

Kitty は、追加設定なしで必要なキーボードプロトコルをサポートします。

## iTerm2

通常のターミナルモードは、追加設定なしで動作します。

### フルスクリーンでの遅いスクロールを修正する

フルスクリーンモードでは Pi がビューポートを制御するため、iTerm2 はターミナル本来の履歴をスクロールする代わりに、マウスホイールのレポートを送信します。そのため、高速なトラックパッドジェスチャーでも一度に約 1 行しか移動しないことがあります。

この動作を変更するには、次の手順を実行します。

1. **iTerm2 > Settings > Advanced** を開きます。
2. **Trackpad scrolls fast?** を検索します。
3. **No** に設定します。

これは iTerm2 全体に適用される設定であり、ネイティブのトラックパッドスクロールにも影響することがあります。根本的な動作については、[iTerm2 の issue 9619](https://gitlab.com/gnachman/iterm2/-/work_items/9619) で追跡されています。

## Apple Terminal

Pi は、利用可能な場合に拡張キーレポートを有効にします。それでも Terminal.app が `Shift+Enter` を通常の Return として送信する場合、Pi は macOS のローカル修飾キーフォールバックを使用し、それを `Shift+Enter` として扱います。

このフォールバックは、Pi が Terminal.app と同じ Mac 上で実行されている場合にのみ機能します。Pi が SSH 経由で別のマシン上で実行されている場合、ローカルの修飾キーの状態は確認できません。

## Ghostty

`Alt+Backspace` が機能しない場合は、Ghostty の設定に次のマッピングを追加します。

```text
keybind = alt+backspace=text:\x1b\x7f
```

設定ファイルは、macOS では `~/Library/Application Support/com.mitchellh.ghostty/config`、Linux では `~/.config/ghostty/config` です。

古い Claude Code の設定には、次の内容が含まれている場合があります。

```text
keybind = shift+enter=text:\n
```

これは生のラインフィードを送信するため、Pi は `Ctrl+J` と区別できません。古い Claude Code のインストールだけを理由にこのマッピングを追加した場合は、削除してください。Pi ではすでに `Ctrl+J` が改行の代替キーとして割り当てられているため、このマッピングは機能しているように見えても、Pi と tmux が実際の `Shift+Enter` イベントを受信できないままになる可能性があります。

### フルスクリーンモードでリンクを開く

フルスクリーンモードでもリンクはクリックできますが、Pi がマウス入力を取得している間、Ghostty は通常のホバー時の下線や URL プレビューを表示しません。Ghostty 本来のリンク処理を使用するには、macOS では `Shift+Command`、Linux では `Shift+Ctrl` を押したままにします。

## WezTerm

WezTerm は通常、xterm 拡張キーを通じて `Shift+Enter` を報告します。Kitty キーボードプロトコルを明示的に有効にするには、`~/.wezterm.lua` を作成します。

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.enable_kitty_keyboard = true
return config
```

### macOS で Alt+Enter を転送する

macOS では、WezTerm はデフォルトで `Option+Enter` をフルスクリーンに割り当てています。これを Pi のフォローアップキューに使用するには、`config.keys` テーブルに次のエントリを追加します。

```lua
{
  key = 'Enter',
  mods = 'ALT',
  action = wezterm.action.SendString('\x1b[13;3u'),
}
```

完全な最小構成は次のとおりです。

```lua
local wezterm = require 'wezterm'
local config = wezterm.config_builder()
config.keys = {
  {
    key = 'Enter',
    mods = 'ALT',
    action = wezterm.action.SendString('\x1b[13;3u'),
  },
}
return config
```

### WSL で IME 候補ウィンドウの位置を調整する

WSL で CJK IME の候補が Pi のテキストカーソルに追従しない場合は、ハードウェアカーソルを表示します。

```bash
export PI_HARDWARE_CURSOR=1
pi
```

代わりに、Pi の設定で `showHardwareCursor` を `true` に設定することもできます。

## Alacritty

Alacritty は通常、`Shift+Enter` を報告します。macOS では、`Option+Enter` が通常の `Enter` として届くことがあります。Pi に転送するには、`~/.config/alacritty/alacritty.toml` に次の内容を追加します。

```toml
[[keyboard.bindings]]
key = "Enter"
mods = "Alt"
chars = "\u001b[13;3u"
```

ファイルを変更した後、Alacritty を再起動します。

## VS Code 統合ターミナル

VS Code 1.109.5 以降では、統合ターミナルで Kitty キーボードプロトコルがデフォルトで有効になっています。

古いバージョンでは、`keybindings.json` に `Shift+Enter` のターミナル用キーバインドを追加します。

```json
{
  "key": "shift+enter",
  "command": "workbench.action.terminal.sendSequence",
  "args": { "text": "\u001b[13;2u" },
  "when": "terminalFocus"
}
```

ユーザー用の `keybindings.json` ファイルは通常、次の場所にあります。

- macOS: `~/Library/Application Support/Code/User/keybindings.json`
- Linux: `~/.config/Code/User/keybindings.json`
- Windows: `%APPDATA%\\Code\\User\\keybindings.json`

## Zed 統合ターミナル

Zed の `keymap.json` に次のキーバインドを追加します。

```json
{
  "context": "Terminal",
  "bindings": {
    "shift-enter": ["terminal::SendText", "\u001b[13;2u"],
    "ctrl--": ["terminal::SendText", "\u001b[45;5u"],
    "ctrl-alt-]": ["terminal::SendText", "\u001b[93;7u"]
  }
}
```

## Windows Terminal

Windows Terminal は、Pi の Windows および WSL 向けのデフォルトショートカットを使用します。完全な一覧については、[キーバインド](keybindings.md)を参照してください。

### Shift+Enter を転送する

`Ctrl+Shift+,` または **Settings > Open JSON file** を使用して、Windows Terminal の `settings.json` を開きます。その `actions` 配列に次のオブジェクトを追加します。

```json
{
  "command": { "action": "sendInput", "input": "\u001b[13;2u" },
  "keys": "shift+enter"
}
```

Windows Terminal を完全に終了してから再度開き、`Shift+Enter` によって Pi で改行が挿入されることを確認します。

### フォローアップに Alt+Enter を使用する

Windows Terminal は、デフォルトで `Alt+Enter` をフルスクリーンに割り当てています。そのため、Pi は Windows および WSL でのフォローアップに `Ctrl+Q` を使用します。

代わりに `Alt+Enter` を使用するには、キーを転送するように Windows Terminal を設定し、Pi の `keybindings.json` で `app.message.followUp` を `alt+enter` に割り当てます。[キーバインド](keybindings.md#assign-keybindings)を参照してください。

## xfce4-terminal と Terminator

これらのターミナルでは、修飾された Enter キーと通常の `Enter` を確実に区別できません。そのため、`Ctrl+Enter` や `Shift+Enter` などのカスタムキーバインドは機能しない場合があります。

これらのショートカットが必要な場合は、Kitty、Ghostty、WezTerm、iTerm2、Windows Terminal、または互換性のある Alacritty ビルドなど、最新の拡張キーをサポートするターミナルを使用してください。

## IntelliJ IDEA 統合ターミナル

IntelliJ IDEA の内蔵ターミナルでは、`Shift+Enter` と通常の `Enter` を確実に区別できません。改行には `Ctrl+J` を使用するか、最新の拡張キーをサポートするターミナルで Pi を実行してください。

IME の候補ウィンドウがテキストカーソルに追従しない場合は、ハードウェアカーソルを表示します。

```bash
export PI_HARDWARE_CURSOR=1
pi
```

## 検出された機能を上書きする

Pi は、OSC 8 ハイパーリンク、インライン画像プロトコル、truecolor のサポートを自動的に検出します。ターミナルプロキシやマルチプレクサーによって、この検出が不正確になることがあります。

| 機能 | 環境変数 | 設定 |
|---|---|---|
| ハイパーリンク | `PI_HYPERLINKS=1\|0\|auto` | `terminal.hyperlinks: true\|false\|"auto"` |
| インライン画像 | `PI_IMAGE_PROTOCOL=kitty\|iterm2\|none\|auto` | `terminal.images: "kitty"\|"iterm2"\|false\|"auto"` |
| Truecolor | `PI_TRUE_COLOR=1\|0\|auto` | `terminal.trueColor: true\|false\|"auto"` |

設定は環境変数より優先されます。値が未設定の場合、または `auto` の場合は、自動検出が維持されます。

ターミナル経路全体でサポートされている機能のみを強制的に有効にしてください。サポートされていないエスケープシーケンスによって、表示が崩れることがあります。正式な値の定義については、[環境変数](environment-variables.md#pi-process-configuration)および[設定](settings.md)を参照してください。
