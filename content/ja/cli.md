<a id="cli-and-modes-reference"></a>

# コマンドライン

このページでは、Pi に組み込まれているコマンドラインのコマンドとオプションについて説明します。インストールされているバージョンの正確なインターフェースを確認するには、`pi --help` を実行するか、コマンドに `--help` を付加してください。トップレベルのヘルプには、読み込まれた拡張機能によって登録されたオプションも含まれます。

```sh
pi [options] [--] [@files...] [messages...]
pi install <source> [options]
pi remove <source> [options]
pi uninstall <source> [options]
pi update [target] [options]
pi list
pi config [options]
pi auth <check|print-api-key|print-bearer-token> [options]
pi mcp <list|login|logout> [options]
```

<a id="modes"></a>

## 呼び出しと出力

```sh
pi
pi --print "Summarize this repository"
git diff | pi --print "Review this change"
pi --mode json "Inspect this repository" > events.jsonl
```

stdin と stdout が端末に接続されている場合、`--print`、`--mode json`、または `--mode rpc` で別のインターフェースを選択しない限り、Pi は端末 UI を開きます。いずれかのストリームがリダイレクトされており、JSON モードも RPC モードも選択されていない場合、Pi は出力モードを使用します。対話、出力、JSON、RPC、SDK の各統合方式から選択する方法については、[CLI 統合](cli-integration.md)を参照してください。

| 入力 | 動作 |
|---|---|
| `message` | 最初のプロンプトを指定します |
| `@path` | 最初のプロンプトにテキストファイルまたは画像を含めます |
| パイプされた stdin | その内容を最初のプロンプトの先頭に追加します |
| `--` | オプションの解析を停止し、プロンプトを `-` で開始できるようにします |

Pi は現在の作業ディレクトリを基準に `@path` を解決します。作業ディレクトリは、プロジェクト設定、リソース検出、セッションのグループ化にも使用されます。

`--print` は、Pi を一度だけ実行して終了するかどうかを制御します。`--mode` は出力インターフェースを選択します。stdin と stdout が端末に接続されている場合、`--mode text` は単発実行を強制しません。その動作には `--print` を使用してください。

| オプション | 動作 |
|---|---|
| `-p`、`--print` | 指定されたプロンプトを実行し、アシスタントの最終テキストを stdout に書き込んで終了します |
| `--mode text` | テキスト出力を選択します。stdin と stdout が端末に接続されている場合は、引き続き端末 UI を開きます |
| `--mode json` | 指定されたプロンプトを実行し、JSONL イベントを stdout に書き込んで終了します |
| `--mode rpc` | シャットダウンされるまで、stdin から JSONL コマンドを読み取り、レスポンスとイベントを stdout に書き込みます |
| `--export <input> [output]` | セッションファイルを HTML にエクスポートして終了します。`output` が省略された場合は出力先を導出します |

RPC モードでは `@file` 引数は拒否されます。JSON モードと RPC モードでは、stdout はプロトコルレコード用に予約されます。[JSON イベントストリーム](json.md)および [RPC プロトコル](rpc.md)を参照してください。

<a id="model-options"></a>

## モデル

```sh
pi --model sonnet:high
```

モデルの選択については[モデルの選択](models.md)を、認証情報については[プロバイダー認証](providers.md)を参照してください。

- `--provider <name>`<br>
  `--model` の検索を単一のプロバイダーに制限します。`--model` が必要です。
- `--model <pattern>`<br>
  完全一致する ID、または ID／名前のあいまい一致で選択します。`provider/id` と、任意の `:<thinking>` サフィックスを使用できます。
- `--api-key <key>`<br>
  永続化されない API キーのオーバーライドを使用します。`--model` または `--models` でモデルを選択する必要があります。
- `--thinking <level>`<br>
  `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、または `max` を設定します。`--model` のサフィックスを上書きし、モデルの能力の範囲内に制限されます。
- `--models <patterns>`<br>
  起動時および切り替え時に使用する範囲を、カンマ区切りで設定します。完全一致する ID、あいまい一致、大文字と小文字を区別しない glob、および任意の `:<thinking>` サフィックスを使用できます。
- `--list-models [search]`<br>
  使用可能なモデルを一覧表示し、必要に応じてあいまい検索で絞り込んでから終了します。

<a id="session-options"></a>

## セッション

```sh
pi --continue
```

セッションの再開、フォーク、命名、保存については、[セッションとコンテキスト](sessions.md)を参照してください。

- `-c`、`--continue`<br>
  現在のプロジェクトで直近のセッションを継続します。
- `-r`、`--resume`<br>
  セッションセレクターを開きます。
- `--session <path|id>`<br>
  ファイルパス、完全一致する ID、または ID の一部で開きます。Pi は最初に現在のプロジェクトを検索し、別のプロジェクトで一致した場合はフォークを提案します。
- `--session-id <id>`<br>
  完全一致するプロジェクトセッション ID を開き、存在しない場合は作成します。ID には、英字、数字、`.`、`_`、`-` を使用できます。
- `--fork <path|id>`<br>
  既存のセッションを、現在のプロジェクト用の新しいセッションとしてフォークします。
- `--session-dir <dir>`<br>
  保存先と検索先を上書きします。`PI_CODING_AGENT_SESSION_DIR` および `sessionDir` 設定よりも優先されます。
- `--no-session`<br>
  永続化されないメモリ内セッションを使用します。
- `-n`、`--name <name>`<br>
  セッションの表示名を設定します。

制約：

- セッション ID の先頭と末尾は、英字または数字でなければなりません。
- `--fork` は、`--session`、`--continue`、`--resume`、`--no-session` のいずれとも併用できません。
- `--session-id` は、`--session`、`--continue`、`--resume` のいずれとも併用できません。新しい ID を選択するには、`--fork` と併用してください。

<a id="tool-options"></a>

## ツール

```sh
pi --tools read,grep,find,ls --print "Review this project"
```

デフォルトのツール選択の設定については、[設定](settings.md#tools)を参照してください。

- `-t`、`--tools <list>`<br>
  デフォルトの選択を、組み込み、拡張機能、またはカスタムの各ツールからなるカンマ区切りの許可リストに置き換えます。
- `-xt`、`--exclude-tools <list>`<br>
  他のすべての選択オプションを適用した後、カンマ区切りで指定したツール名を無効にします。
- `-nbt`、`--no-builtin-tools`<br>
  拡張機能とカスタムツールを維持したまま、デフォルトの組み込みツールを無効にします。
- `-nt`、`--no-tools`<br>
  すべての組み込み、拡張機能、カスタムツールを無効にして起動します。

`defaultTools` で変更されていない限り、デフォルトで有効なツールは `read`、`bash`、`edit`、`write` です。`--tools` は選択全体を置き換えるため、使用するすべてのツール名を指定してください。代わりに `defaultTools` では、`+name` と `-name` を使用してデフォルトを変更することもできます。

| 組み込みツール | 用途 |
|---|---|
| `read` | テキストファイルとサポート対象の画像を読み取ります |
| `bash` | シェルコマンドを実行します |
| `powershell` | Windows で PowerShell コマンドを実行します |
| `edit` | 既存のファイルに完全一致するテキスト置換を適用します |
| `write` | ファイルを作成または上書きします |
| `grep` | ファイルの内容を検索します |
| `find` | glob パターンを使用してパスを検索します |
| `ls` | ディレクトリの内容を一覧表示します |

組み込み拡張機能により、さらに 2 つのツールが追加されます。これらはデフォルトでは無効です。MCP サーバーが必要とする場合、MCP 拡張機能が有効にします（[MCP](mcp.md#exposure)を参照）。自分で有効にするには、`--tools` または `defaultTools` にツール名を指定してください。

| 組み込み拡張機能 | 用途 |
|---|---|
| `codemode` | 他のツールを呼び出す JavaScript を実行します。たとえば、`Promise.allSettled` を使用して並列実行できます。モデルにはスクリプトの出力のみが渡されます |
| `tool_search` | モデルに宣言されていないツール（MCP ツールなど、公開方式が `codemode` および `deferred` のもの）を検索し、一致したツールを次回の呼び出し用に宣言します |

### codemode の有効化

すべてのセッションで `codemode` を有効にするには、`~/.pi/agent/settings.json` またはプロジェクトの `.pi/settings.json` にあるデフォルトツールへ追加します。

```json
{
  "defaultTools": ["+codemode"]
}
```

これにより `read`、`bash`、`edit`、`write` を維持したまま、`codemode` が追加されます。`--tools` は選択を置き換えるため、1 回の呼び出しだけで使用する場合は、すべてのツールを列挙してください。

```sh
pi --tools read,bash,edit,write,codemode
```

Codemode は MCP がなくても有用です。スクリプトで複数のツール呼び出しを並列実行し、大量の出力がモデルに渡る前に絞り込み、`models.classify()` を介して TypeSafe の Jev などの分類モデルを呼び出せます（[分類モデル](models.md#use-classifier-models)を参照）。

### codemode の仕組み

Codemode スクリプトは、`tools.<name>(args)` を介して他のツールにのみアクセスできる QuickJS サンドボックス内で実行されます。`ALL_TOOLS` でそれらを一覧表示できます。出力は、`text(value)`、`image(dataUrlOrImageContent)`、`console.*`、およびトップレベルの `return value` から生成され、`exit()` はスクリプトを早期終了します。結果は `Script completed` または `Script failed`、経過時間、出力の順で始まります。スクリプトが失敗した場合も部分的な出力は保持され、その後に `Script error:` とエラーが続きます。

スクリプトの先頭には、`// @options: {"max_output_tokens": 2000, "timeout_ms": 60000}` のようなオプション行を記述できます。`max_output_tokens`（デフォルトは 10000）は出力を制限します。これを超える出力では先頭と末尾が保持され、全文が一時ファイルに書き込まれ、そのパスが結果に含まれます。`timeout_ms` は厳格な期限であり、デフォルトでは設定されていません。

`codemode` が有効な間、[設定](settings.md#tools)の `codemode.mode` によって、他のツールの提示方法が決まります。`on`（デフォルト）では、宣言済みツールは引き続き宣言され、その説明にスクリプトから呼び出す方法が示されます。`only` では、ツールはモデルから隠され、代わりに `codemode` の説明に列挙されるため、モデルはスクリプトを介してそれらを呼び出します。

`codemode` の説明には、呼び出し可能なツールが TypeScript 宣言とともに、名前空間（たとえば 1 つの MCP サーバー）別にまとめて列挙されます。MCP ツールのデフォルトの `codemode` 公開方式を含む、`deferred` 公開方式のツールは列挙されず、説明にも影響しないため、MCP サーバーが接続されても説明は変わりません。宣言全体では、推定 3000 トークンの予算を共有します（[設定](settings.md#tools)の `codemode.inlineBudget`）。スクリプトは、BM25 でツールを順位付けする `await searchTools(query, { limit, namespace })` と `await describeTool(name)`、または `ALL_TOOLS` の絞り込みによって、残りのツールを検索します。`await describeNamespace(name)` は、名前空間の説明、その指示（MCP サーバーの場合はサーバーの指示）、およびそのツール名を返します。

出力スキーマを持つツールは構造化された値に解決されます。`bash` は終了コードが 0 以外の場合も `{ output, truncated, full_output_path?, exit_code, wall_time_seconds }` に解決され、MCP ツールは各ツールの `CallToolResult` に解決されます。その他のツールはテキスト出力に解決されます。`bash` の `output` は、モデルに表示される 2000 行または 50 KB に制限されません。最大 1 MiB を保持し、それを超える出力では省略マーカーを挟んで先頭と末尾の各 512 KiB を保持し、`truncated` が設定され、完全な出力が `full_output_path` に格納されます。

`store(key, value)` と `load(key)` は、`codemode` の呼び出し間で JSON 値を保持します。値を保存したスクリプトが成功するたびに、セッションへ `codemode-store` カスタムエントリが追加されるため、再開したセッションでも値が保持され、各分岐からはその経路上で書き込まれた値のみが見えます。スクリプトでは `models` も使用できます。`getModelsOfType`、`getAvailableOfType`、`getModelOfType` はモデルカタログを一覧表示し、`classify(model, context)` はセッションの認証情報を使用して分類モデルを実行します。各スクリプトで同時に実行できるのは最大 4 つです。

### ツール検索

`tool_search` はデフォルトで無効です。`"defaultTools": ["+tool_search"]` または `--tools` で有効にします。まだ宣言されていないツールに対して `searchTools()` と同じランキングを使用し、一致したツールを次回のモデル呼び出し用に宣言します。読み込まれたツールは、ほかのツール変更と同様にセッションへ記録されるため、その分岐では宣言されたままになります。

<a id="resource-options"></a>

## リソース

```sh
pi --extension ./review.ts
```

標準のディレクトリとプロジェクトの信頼については[設定](configuration.md)、構成済みのパスについては[設定項目](settings.md#resources)、パッケージのソースについては[Pi パッケージ](packages.md)を参照してください。

- `-e`、`--extension <path>`<br>
  拡張機能のファイルまたはディレクトリ、あるいは `builtin:mcp` などの組み込み拡張機能を読み込みます。複数回指定できます。
- `-ne`、`--no-extensions`<br>
  検出された拡張機能、構成済みの拡張機能、および組み込み拡張機能を無効にします。明示的に指定した `-e` のパスは引き続き読み込まれるため、`pi -ne -e builtin:mcp` では組み込みの MCP サポートのみが維持されます。
- `--skill <path>`<br>
  スキルのファイルまたはディレクトリを読み込みます。複数回指定できます。
- `-ns`、`--no-skills`<br>
  検出されたスキルと構成済みのスキルを無効にします。明示的に指定した `--skill` のパスは引き続き読み込まれます。
- `--prompt-template <path>`<br>
  プロンプトテンプレートのファイルまたはディレクトリを読み込みます。複数回指定できます。
- `-np`、`--no-prompt-templates`<br>
  検出されたテンプレートと構成済みのテンプレートを無効にします。明示的に指定した `--prompt-template` のパスは引き続き読み込まれます。
- `--theme <path>`<br>
  テーマのファイルまたはディレクトリを読み込みます。複数回指定できます。
- `--use-theme <name[/name]>`<br>
  今回の実行で最初に使用する対話型テーマを選択します。
- `--no-themes`<br>
  検出されたテーマと構成済みのテーマを無効にします。明示的に指定した `--theme` のパスは引き続き読み込まれます。
- `-nc`、`--no-context-files`<br>
  `AGENTS.md` と `CLAUDE.md` の検出を無効にします。

リソースのパスは現在のプロセスにのみ適用されます。相対パスは現在の作業ディレクトリを基準に解決されます。

<a id="prompt-and-display-options"></a>

## プロンプトとプロセス

```sh
pi --append-system-prompt ./instructions.md
```

保存済みの構成については[設定](configuration.md)、プロジェクトの信頼については[セキュリティ](security.md#understand-project-trust)、プロセスの制御については[環境変数](environment-variables.md)を参照してください。

- `--system-prompt <text|path>`<br>
  デフォルトのシステムプロンプトを、テキストまたは既存ファイルの内容で置き換えます。
- `--append-system-prompt <text|path>`<br>
  システムプロンプトにテキストまたは既存ファイルの内容を追加します。複数回指定できます。
- `--tui-mode <mode>`<br>
  `regular` または `fullscreen` のターミナルモードを使用します。
- `--verbose`<br>
  `quietStartup` を上書きし、対話モードの起動時に詳細情報を表示します。
- `-a`、`--approve`<br>
  このプロセスで、プロジェクトローカルの設定とリソースを信頼します。
- `-na`、`--no-approve`<br>
  このプロセスで、信頼によって制限されるプロジェクトローカルの設定とリソースを無視します。
- `--offline`<br>
  モデルカタログの更新を含む自動的なネットワーク処理を無効にします。`PI_OFFLINE=1` と同等です。
- `-h`、`--help`<br>
  読み込まれた拡張機能が登録したフラグを含むヘルプを表示して終了します。
- `-v`、`--version`<br>
  Pi のバージョンを表示して終了します。

拡張機能は、追加の長形式オプションを登録できます。不明な短形式オプションは拒否されます。

## パッケージコマンド

```sh
pi install npm:@scope/package
```

ソース形式、フィルタリング、インストール、プロジェクトスコープについては、[Pi パッケージ](packages.md)を参照してください。

### 一般的なタスク

| タスク | コマンド |
|---|---|
| パッケージをインストールする | `pi install <source>` |
| 構成済みのパッケージを一覧表示する | `pi list` |
| パッケージとその設定エントリを削除する | `pi remove <source>` |
| 読み込むパッケージリソースを構成する | `pi config` |

グローバル設定の代わりにプロジェクト設定を使用するには、`install`、`remove`、`uninstall`、または `config` に `--local` または `-l` を追加します。

### Pi またはパッケージの更新

対象を指定せずに `pi update` を実行すると、Pi 自体が更新されます。

| タスク | コマンド |
|---|---|
| Pi を更新する | `pi update` |
| インストール済みのすべてのパッケージを更新する | `pi update --extensions` |
| インストール済みのパッケージを1つ更新する | `pi update <source>` |
| モデルカタログを更新する | `pi update --models` |
| Pi とインストール済みのすべてのパッケージを更新する | `pi update --all` |

選択した更新に Pi が含まれる場合に Pi を再インストールするには、`--force` を追加します。

### エイリアスとコマンドオプション

- `pi uninstall <source>` は `pi remove <source>` のエイリアスです。
- `pi update --self`、`pi update self`、`pi update pi` は `pi update` のエイリアスです。
- `pi update --extension <source>` は `pi update <source>` のエイリアスです。
- `-a`、`--approve` は、1つのコマンドに限りプロジェクトローカルのファイルを信頼します。`-na`、`--no-approve` は、信頼によって制限されるプロジェクトローカルのファイルを無視します。
- 正確な使用方法とオプションの制約を確認するには、コマンドに `-h` または `--help` を追加します。

## 認証情報コマンド

```sh
pi auth check --provider openai --json
```

認証コマンドには `--provider <provider>` または `--model <model>` が必要です。サポートされている方式については、[プロバイダー認証](providers.md)を参照してください。

| コマンド | 説明 |
|---|---|
| `pi auth check` | `ready`、`not_ready`、または `invalid` を出力し、それぞれステータス `0`、`1`、または `2` で終了します |
| `pi auth print-api-key` | 解決された API キーを出力します |
| `pi auth print-bearer-token` | 解決された OAuth ベアラートークンを出力します |

| オプション | 適用対象 | 説明 |
|---|---|---|
| `--provider <provider>` | すべて | プロバイダーの認証情報を解決します |
| `--model <model>` | すべて | モデルから認証情報を解決します。`--provider` と組み合わせられます |
| `--json` | `auth check` | 構造化された結果を JSON として書き込みます |
| `--credentials` | `auth check` | 準備ができている場合、解決された認証情報を出力します |
| `--no-refresh` | `auth check` | 期限切れの OAuth 認証情報を更新しません。デフォルトでは更新します |
| `--min-expiry <duration>` | `print-bearer-token` | `30m` のように、`ms`、`s`、`m`、または `h` を使用して、必要なトークンの残存有効期間を指定します |

認証情報を出力するコマンドは、シークレットを標準出力に書き込みます。

## MCP コマンド

これらのコマンドはセッション外で動作するため、エージェントは `bash` を介して実行できます。[MCP サーバー](mcp.md)を参照してください。

| コマンド | 説明 |
|---|---|
| `pi mcp add <server> [options] -- <command> [args...]` | `mcp.json` 内の stdio サーバーを追加または置換します。`--env KEY=VALUE`（複数回指定可能）と `--cwd <dir>` で、その環境と作業ディレクトリを設定します。コマンドの後の引数は、そのコマンドに渡されます |
| `pi mcp add <server> [options] --url <url>` | ストリーミング可能な HTTP サーバーを追加または置換します。`--header KEY=VALUE`（複数回指定可能）、`--bearer-token-env-var <NAME>`（`Authorization: Bearer ${NAME}` を送信）、`--oauth-client-id`、`--oauth-client-secret`、`--oauth-callback-port`、`--oauth-client-name` で認証を構成します |
| `pi mcp remove <server>` | `mcp.json` からサーバーを削除します。保存済みの OAuth 認証情報は維持されます |
| `pi mcp list [--json]` | 有効なすべてのサーバーに接続し、その状態、ツール、エラーを出力します。設定エントリが無効な場合、または有効なサーバーが接続されていない場合は `1` で終了します |
| `pi mcp login <server> [--timeout <seconds>]` | OAuth サーバーにサインインします。認可ページを開き、ブラウザーを待機します（デフォルトは300秒）。ターミナルでは、貼り付けられたリダイレクト URL も受け付けます |
| `pi mcp logout <server>` | サーバーの保存済み OAuth 認証情報を削除します |

`add` と `remove` は `~/.pi/agent/mcp.json` を変更します。`--local`（`-l`）を指定すると、現在のディレクトリにある `.pi/mcp.json` を変更します。`add` は `--exposure <mode>`（[公開範囲](mcp.md#exposure)を参照）と `--description <text>` も受け取り、接続は行いません。サーバーを確認するには `pi mcp list` を実行します。

プロジェクトの `.pi/mcp.json` ファイルは、すでに信頼されているプロジェクトでのみ読み込まれます。
