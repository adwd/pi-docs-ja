# シェルコマンドを設定する

Pi は、Bash コマンドごとに個別の非対話型シェルプロセスを起動します。非対話型 Bash はデフォルトではエイリアスを展開せず、通常は対話型ターミナルと同じ起動ファイルを読み込みません。

Bash 実行可能ファイルを選択するには `shellPath` を使用し、各コマンドの前にセットアップを実行するには `shellCommandPrefix` を使用します。

## Pi が使用するシェルを理解する

| コマンドの実行元 | シェル |
|---|---|
| モデルが組み込みの `bash` ツールを呼び出す | Pi が解決した Bash 実行可能ファイル |
| `!command` または `!!command` を入力する | 同じ解決済みの Bash 実行可能ファイル |
| モデルがオプションの `powershell` ツールを呼び出す | PowerShell 7（`pwsh.exe`）または Windows PowerShell |
| 拡張機能がシェルツールを提供または置き換える | その拡張機能によって実装された操作 |

Pi は通常、`bash -c` で Bash を起動します。Unix システムでは、`/bin/bash`、次に `PATH` 上の `bash`、最後に Bash が利用できない場合は `sh` を使用します。ネイティブ Windows では、最初に設定済みのパス、次に Git Bash、最後に `PATH` 上の `bash.exe` を確認します。

## Bash 実行可能ファイルを選択する

Pi で特定の実行可能ファイルを使用する場合は、`~/.pi/agent/settings.json` で `shellPath` を設定します。

```json
{
  "shellPath": "~/.local/bin/bash"
}
```

Windows では、スラッシュを使用するか、バックスラッシュをエスケープします。

```json
{
  "shellPath": "C:\\cygwin64\\bin\\bash.exe"
}
```

設定を変更した後、`/reload` を実行します。ネイティブ Windows のデフォルトについては、[Windows で Pi を実行する](windows.md)を参照してください。

## 各 Bash コマンドの前にセットアップを実行する

組み込みの `bash` ツールと、ユーザーが入力した `!` または `!!` コマンドの両方にシェルのセットアップを付加するには、`shellCommandPrefix` を設定します。

```json
{
  "shellCommandPrefix": "export CI=1"
}
```

Pi は、プレフィックスと要求されたコマンドを改行で連結します。プレフィックスはコマンドごとに再実行されるため、高速に実行でき、対話型プロンプトを含まないようにしてください。

## Bash エイリアスを有効にする

Pi で必要なエイリアスは、対話型シェルの設定全体を解析するのではなく、Bash 互換ファイルに保存します。

`~/.bash_aliases` を作成します。

```bash
alias ll='ls -la'
alias gs='git status --short'
```

次に、エイリアス展開を有効にしてファイルを読み込むように Pi を設定します。

```json
{
  "shellCommandPrefix": "shopt -s expand_aliases\nsource ~/.bash_aliases"
}
```

`/reload` を実行してから、Pi を通じてエイリアスを確認します。

```text
!ll
```

このコマンドでは、`ls -la` と同じ一覧が出力されるはずです。

エイリアスには Bash 互換の構文を使用する必要があります。zsh のオプション、関数、プラグインは Bash では正しく解析または動作しない可能性があるため、任意の `.zshrc` を Bash で source しないでください。

## トラブルシューティング

### プレフィックスは `!` では機能するが、拡張機能のツールでは機能しない

`shellCommandPrefix` は、Pi の組み込み Bash 実行を設定します。`bash` ツールを置き換える拡張機能や、独自のシェル操作を提供する拡張機能は、独自のセットアップを制御します。その拡張機能のドキュメントを確認してください。

### `shopt` が見つからない

Pi が `sh` にフォールバックしているか、`shellPath` が Bash 以外のシェルを指しています。`shopt` などの Bash 固有のセットアップを使用する前に、Bash をインストールするか、`shellPath` を Bash 実行可能ファイルに設定してください。

### セットアップコマンドが入力を待機する

`shellCommandPrefix` から対話型コマンドを削除してください。プレフィックスは各 Bash コマンドの前に、非対話型プロセスで実行されます。

設定の完全な定義については、[シェル設定](settings.md#shell)を参照してください。
