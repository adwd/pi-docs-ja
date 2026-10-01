# Windows で Pi を実行する

Pi は、Windows のネイティブプロセスとして、または Windows Subsystem for Linux（WSL）内で実行できます。ネイティブ Windows では、Bash コマンドにデフォルトで Git Bash を使用し、必要に応じてモデルから PowerShell を利用できるように設定できます。WSL 内の Pi は、Linux 環境とそこにインストールされた Bash を使用します。

メインの[クイックスタート](quickstart.md)に従って、Pi をインストールし、認証してください。このページでは、コマンド環境の選択方法と設定方法について説明します。

## ネイティブ Windows または WSL を選択する

| 環境 | コマンド環境 | 使用する場合 |
|---|---|---|
| Git Bash を使用するネイティブ Windows | 組み込みの `bash` ツールおよび `!` コマンドに Git Bash を使用 | ファイルと開発ツールが主に Windows 上にある場合 |
| `powershell` ツールを使用するネイティブ Windows | モデルのツール呼び出しに PowerShell を使用し、`!` コマンドでは引き続き Bash を利用可能 | タスクが PowerShell モジュールまたは Windows ネイティブのコマンドに依存する場合 |
| WSL | 選択した WSL ディストリビューション内の Linux Bash とツール | ファイルとツールチェーンがすでに Linux または WSL 内にある場合 |

## ネイティブ Windows で Git Bash を使用する

ネイティブ Windows を使用するほとんどのユーザーは、[Git for Windows](https://git-scm.com/download/win)をインストールすれば十分です。

Pi は、次の順序で Bash を解決します。

1. `~/.pi/agent/settings.json` の `shellPath`
2. `Program Files` または `Program Files (x86)` 内の Git Bash
3. Cygwin、MSYS2、または従来の WSL Bash を含む、`PATH` 上の `bash.exe`

Pi を起動し、次のコマンドを入力してシェルを確認します。

```text
!printf 'Bash is working\n'
```

Pi が Bash を見つけられない場合は、確認した場所が報告されます。Git for Windows をインストールするか、別の Bash 実行ファイルを `PATH` に追加するか、`shellPath` を設定してください。

## モデルで PowerShell を使用できるようにする

オプションの `powershell` ツールは、利用可能な場合は `pwsh.exe` を介してコマンドを実行し、利用できない場合は Windows PowerShell にフォールバックします。PowerShell は `-NoProfile -NonInteractive -ExecutionPolicy Bypass` を指定して起動されます。管理者によって適用される実行ポリシーが引き続き優先される場合があります。

モデル向けの `bash` ツールを `powershell` に置き換えるには、`~/.pi/agent/settings.json` に次の設定を追加します。

```json
{
  "defaultTools": ["read", "powershell", "edit", "write"]
}
```

`["-bash", "+powershell"]` を指定すると、設定済みのほかのデフォルトツールを維持したまま同じ変更を適用できます。

Pi を再起動し、無害な PowerShell コマンドを実行するよう依頼します。エディターの `!` コマンドと `!!` コマンドでは、引き続き Bash が使用されます。`powershell` ツールは、Pi が Windows のネイティブプロセスとして実行されている場合にのみ利用できます。

そのほかのツールの組み合わせについては、[設定](settings.md#tools)を参照してください。

## カスタム Bash 実行ファイルを使用する

Pi が自動検出しない場所に Bash がインストールされている場合は、`shellPath` を設定します。

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

JSON では、バックスラッシュをエスケープシーケンスに使用します。バックスラッシュを含む Windows パスを記述する場合は、上記のように各バックスラッシュを 2 つずつ記述してください。

コマンドプレフィックス、エイリアス、およびシェル解決の完全な動作については、[シェルコマンドを設定する](shell-aliases.md)を参照してください。

## Windows Terminal を設定する

Windows Terminal は、一部の修飾キー付きのキー入力を予約または書き換えます。`Shift+Enter` と `Alt+Enter` の設定方法については [Windows Terminal](terminal-setup.md#windows-terminal)を、Pi における Windows と WSL のデフォルトショートカットについては[キーバインド](keybindings.md)を参照してください。
