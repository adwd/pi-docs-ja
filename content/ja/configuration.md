# 設定

Pi はユーザーレベルとプロジェクトの設定をサポートします。ユーザーレベルの設定はエージェントディレクトリにあり、デフォルトは `~/.pi/agent` です。プロジェクト設定は作業ディレクトリ配下の `.pi` にあり、[プロジェクトの信頼](security.md#understand-project-trust)が許可された後に読み込まれます。唯一の例外は `sessionDir` です。Pi はセッションを特定できるように、信頼を解決する前にこれを読み取ります。

対話モードでは、一般的な環境設定を変更するには `/settings` を使用します。その他のオプションについては、Pi に設定の更新を依頼するか、関連ファイルを直接編集します。設定、キーバインド、指示、またはリソースを手動で変更した後は、`/reload` を実行します。

## エージェントディレクトリ

以下では、エージェントディレクトリを `<agent-dir>` と表記します。その場所は、`PI_CODING_AGENT_DIR` 環境変数または SDK の [`agentDir`](sdk.md) オプションで設定します。

| パス | 役割 |
|---|---|
| `<agent-dir>/settings.json` | 環境設定、デフォルト、リソースパス、Pi パッケージ宣言を含むユーザーレベルの[設定](settings.md)。 |
| `<agent-dir>/keybindings.json` | カスタムのターミナル UI とアプリケーションの[キーバインド](keybindings.md)。 |
| `<agent-dir>/mcp.json` | すべてのプロジェクトで利用可能な [MCP サーバー](mcp.md)。 |
| `<agent-dir>/models.json` | [互換性のあるエンドポイント、モデル、モデルのオーバーライド](models.md#configure-a-compatible-endpoint)。 |
| `<agent-dir>/auth.json` | 保存された API キーと OAuth 認証情報。 |
| `<agent-dir>/AGENTS.override.md`、`AGENTS.md`、`AGENTS.MD`、`CLAUDE.md`、または `CLAUDE.MD` | 複数の作業ディレクトリにわたって適用されるユーザー指示。 |
| `<agent-dir>/SYSTEM.md` | Pi のデフォルトのシステムプロンプトを置き換えます。 |
| `<agent-dir>/APPEND_SYSTEM.md` | Pi のシステムプロンプトに指示を追加します。 |
| `<agent-dir>/extensions/` | ユーザーの[拡張機能](extensions.md)。 |
| `<agent-dir>/skills/` | ユーザーの[スキル](skills.md)とサポートファイル。 |
| `<agent-dir>/prompts/` | スラッシュコマンドとして公開されるユーザーの[プロンプトテンプレート](prompt-templates.md)。 |
| `<agent-dir>/themes/` | ユーザーの[テーマ](themes.md)ファイル。 |

## プロジェクトの `.pi` ディレクトリ

| パス | 役割 |
|---|---|
| `.pi/settings.json` | プロジェクトレベルの[設定](settings.md)、リソースパス、Pi パッケージ宣言。 |
| `.pi/mcp.json` | プロジェクトの [MCP サーバー](mcp.md)。 |
| `.pi/SYSTEM.md` | プロジェクトのシステムプロンプトを置き換えます。 |
| `.pi/APPEND_SYSTEM.md` | システムプロンプトにプロジェクト固有の指示を追加します。 |
| `.pi/extensions/` | プロジェクトの拡張機能。 |
| `.pi/skills/` | プロジェクトのスキルとサポートファイル。 |
| `.pi/prompts/` | スラッシュコマンドとして公開されるプロジェクトのプロンプトテンプレート。 |
| `.pi/themes/` | プロジェクトのテーマファイル。 |

`SYSTEM.md` と `APPEND_SYSTEM.md` では、信頼されたプロジェクトのファイルが、対応するエージェントディレクトリのファイルより優先されます。同名のファイルは結合されません。

## コンテキストファイル

コンテキストファイルは、プロジェクトの `.pi` 設定とは別のものです。Pi は、エージェントディレクトリ、作業ディレクトリ、およびその親ディレクトリからコンテキストファイルを読み込みます。コンテキストファイルは、Pi がそのファイルのあるディレクトリまたはその配下の任意の場所で実行される場合に適用されます。

`AGENTS.override.md` は、同じディレクトリ内に限り `AGENTS.md` または `CLAUDE.md` を置き換えます。エージェントディレクトリやその他のディレクトリにあるコンテキストファイルは抑制しません。

コンテキストファイルの検出にプロジェクトの信頼は必要ありません。
