# SDK

`@earendil-works/pi-coding-agent` は、Pi を Node.js または Bun プロセスに組み込みます。コマンドラインアプリケーションで使用されるエージェント、セッション、ツール、モデル、リソースに TypeScript から直接アクセスできます。

プロセス内で TypeScript と統合するには SDK を使用します。言語に依存しないサブプロセスまたは分離されたサブプロセスについては、[CLI 統合](cli-integration.md)を参照してください。

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.prompt("What files are in the current directory?");
  console.log(session.getLastAssistantText());
} finally {
  session.dispose();
}
```

これは、作業ディレクトリ、検出されたリソース、保存済みの設定、構成済みの認証情報を使用します。実行が完了すると `prompt()` が解決されます。

[完全な最小例](../examples/sdk/01-minimal.ts)では、テキストイベントもストリーミングします。すべての [SDK の例](../examples/sdk/)は、リポジトリとともに型チェックされます。

<a id="session-management"></a>

## セッションのライフサイクル

`createAgentSession()` は `AgentSession` を作成します。セッションは、1 つの会話、そのモデルとツール、キューに入ったメッセージ、圧縮状態、拡張機能ランタイムを所有します。

現在の状態は、`session.messages`、`session.model`、`session.thinkingLevel`、`session.systemPrompt`、`session.getActiveToolNames()` を通じて読み取ります。

`session.systemPrompt` は読み取り専用で、モデルにまだ送信されていない変更を含む、現在有効なシステムプロンプトを返します。ツールの変更は、次のリクエストの前にモデルへ宣言されます。

<a id="sessionmanager-api"></a>

### セッションストレージ

セッションはデフォルトで永続化されます。`SessionManager` は、永続化された、またはメモリ内のエントリツリーを所有し、そのアクティブなリーフを追跡します。分岐すると、放棄された分岐を削除せずにそのリーフが変更されます。Pi がモデルのコンテキストを再構築するとき、マネージャーはアクティブな分岐を選択し、圧縮を適用します。

確定したモデルコンテキストについては、`SessionManager` が信頼できる情報源です。外部の履歴を復元するには、それらのエントリを含むマネージャーを使用してセッションを構築します。`session.agent.state.messages` に代入しても、永続化されたコンテキストは置き換えられません。

ホストがセッションファイルを必要としない場合は、メモリ内マネージャーを使用します。

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
```

セッションの作成、オープン、続行、一覧表示、フォークについては、チェック済みの[セッションの例](../examples/sdk/11-sessions.ts)を参照してください。[セッションファイル形式](session-format.md)では永続化される JSONL の規約を定義し、[メッセージ型](message-types.md)ではトランスクリプトの値を定義しています。正確なメソッドとシグネチャについては、エクスポートされた TypeScript 宣言または [`session-manager.ts`](../src/core/session-manager.ts) を使用してください。

`cwd` は、プロジェクトリソースの検出、コンテキストファイル、セッションのグループ化、組み込みツールのパスに使用するワークスペースを選択します。対象が `process.cwd()` と異なる場合は、明示的に渡してください。

`session.dispose()` は、アクティブな処理を中止し、拡張機能のコンテキストを無効化し、エージェントから切断して、イベントリスナーを削除します。セッションが不要になったら呼び出してください。

`AgentSessionRuntime` は、`newSession()`、`switchSession()`、`fork()`、`importFromJsonl()` を追加します。各操作はアクティブな `AgentSession` を置き換え、対象の作業ディレクトリ用にサービスを再作成します。

ランタイムを置き換えた後も、サブスクリプションは古い `AgentSession` に属しているため、再バインドする必要があります。[セッションランタイムの例](../examples/sdk/13-session-runtime.ts)を参照してください。

## プロンプトの送信

`prompt()` は、通常のユーザーメッセージがエージェントに入る前に、拡張機能のコマンドを処理し、ファイルベースのプロンプトテンプレートを展開します。受け付けられたエージェント実行では、自動再試行を含む実行が完了した後に解決されます。

セッションがすでにストリーミング中に送信するプロンプトでは、現在の実行をステアリングするか、その後にフォローアップするかを指定する必要があります。この選択を指定せずに `prompt()` を呼び出すと、推測するのではなく拒否されます。

ステアリングメッセージは、現在のアシスタントターンとそのツール呼び出しの後に入ります。フォローアップは、現在の実行が保留中の処理を完了した後に入ります。`steer()` と `followUp()` はこれらの動作を直接公開し、入力がキューに入った場合（拡張機能による変換後を含む）は `"queued"` を、拡張機能が入力を処理済みにした場合は `"handled"` を返します。

`abort()` はアクティブな操作を停止し、セッションがアイドル状態になるまで待機します。`waitForIdle()` は操作を中止せずに待機します。

## イベントの購読

ホストがストリーミング出力を必要とする場合は、プロンプトを送信する前に購読します。

```typescript
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await session.prompt("Explain this repository");
} finally {
  unsubscribe();
}
```

セッションイベントは、メッセージの更新、ツールの実行、キュー、圧縮、再試行、実行ライフサイクルの変更を報告します。

`message_end` には、信頼できる確定済みメッセージが含まれます。`agent_end` は低レベルのエージェント実行 1 回の終了を示しますが、その後も自動復旧やキューに入った処理が続く場合があります。

Pi が自動的に続行しないことをホストが把握する必要がある場合は、`agent_settled` を使用します。

## セッションの構成

オーバーライドがない場合、ファクトリは `ModelRuntime`、ファイルをバックエンドとする `SettingsManager`、永続的な `SessionManager`、`DefaultResourceLoader`、および構成済みのデフォルトツールを作成します。

各境界は明示的に指定できます。

- `modelRuntime`、`model`、`thinkingLevel`、`scopedModels` は、モデルへのアクセスと選択を制御します。
- `settingsManager` は、統合済みの設定またはメモリ内構成を提供します。
- `sessionManager` は、永続的またはメモリ内の会話履歴を提供します。
- `resourceLoader` は、拡張機能、スキル、プロンプトテンプレート、テーマ、コンテキストファイルを提供します。
- `tools`、`noTools`、`excludeTools`、`customTools` は、アクティブなツールセットを制御します。

選択したオーバーライドを適用しつつ標準の検出を使用する場合は、`DefaultResourceLoader` を使用します。ホストがリソースの保存と検出を完全に管理する場合は、カスタム `ResourceLoader` を指定します。

<a id="inlineextension"></a>

インライン拡張機能ファクトリは、`DefaultResourceLoader` を通じて指定できます。診断と起動時の出力で安定した名前が必要な場合にのみ、`InlineExtension` の名前を付けてください。`replaceable: true` を持つ名前付きインライン拡張機能は、別の拡張機能が、読み込み中にそのインライン拡張機能が登録する名前と同じ名前のツール、コマンド、またはフラグを登録した場合、競合したまま両方を読み込むのではなく除外されます。CLI の組み込み codemode、ツール検索、MCP 拡張機能は置き換え可能です。`builtin: true` を持つ名前付きエントリはインライン拡張機能ではありません。これは `builtin:<name>` 拡張機能のコードを提供し、構成済みの拡張機能ファイルと同様に読み込まれます。デフォルトで読み込まれ、`pi config` に一覧表示され、`extensions` 設定の `-builtin:<name>` または `noExtensions` によって無効化されます。`additionalExtensionPaths: ["builtin:<name>"]` を指定すると明示的に読み込まれます。プロジェクトの信頼性が解決された後に読み込まれるため、`project_trust` は処理できません。CLI の組み込み拡張機能はこれを使用します。

<a id="codemode-mcp"></a>

CLI は、`codemode`、`tool_search`、MCP を組み込み拡張機能として読み込みます。SDK セッションはこれらを読み込みません。`createCodemodeExtension()`、`createToolSearchExtension()`、`createMcpExtension()` を、`DefaultResourceLoader` の `extensionFactories` に追加してください。`codemode` と `tool_search` は非アクティブな状態で登録されます。`defaultTools` 設定を通じて有効化するか（`["+codemode", "+tool_search"]` はその他のデフォルトツールを維持します）、MCP 拡張機能で有効化します。`codemode` を公開するサーバーには `codemode`、`deferred` を公開するサーバーには `tool_search` を使用します。MCP 拡張機能は `session_start` でサーバーに接続するため、`session.bindExtensions()` を呼び出してください。[Codemode と MCP](../examples/sdk/14-codemode-mcp.ts)を参照してください。

[モデル](../examples/sdk/02-custom-model.ts)、[ツール](../examples/sdk/05-tools.ts)、[拡張機能](../examples/sdk/06-extensions.ts)、[完全な制御](../examples/sdk/12-full-control.ts)に焦点を当てた例を参照してください。

## 例

| 例 | 目的 |
|---|---|
| [最小構成](../examples/sdk/01-minimal.ts) | セッションを作成し、プロンプトを送信し、監視して、破棄する |
| [カスタムモデル](../examples/sdk/02-custom-model.ts) | モデルと思考レベルを選択する |
| [システムプロンプト](../examples/sdk/03-custom-prompt.ts) | システムプロンプトを置き換える、または追記する |
| [スキル](../examples/sdk/04-skills.ts) | スキルを検出、フィルタリング、追加する |
| [ツール](../examples/sdk/05-tools.ts) | 組み込みツールとその作業ディレクトリを選択する |
| [拡張機能](../examples/sdk/06-extensions.ts) | ファイルベースおよびインラインの拡張機能を読み込む |
| [コンテキストファイル](../examples/sdk/07-context-files.ts) | プロジェクトの指示を追加または置換する |
| [プロンプトテンプレート](../examples/sdk/08-prompt-templates.ts) | ファイル形式のプロンプトテンプレートを追加する |
| [認証情報](../examples/sdk/09-api-keys-and-oauth.ts) | 認証情報とモデルのストレージを構成する |
| [設定](../examples/sdk/10-settings.ts) | ファイルをバックエンドとする設定またはメモリ内の設定を提供する |
| [セッション](../examples/sdk/11-sessions.ts) | セッションの永続化と復元を制御する |
| [完全な制御](../examples/sdk/12-full-control.ts) | デフォルトの検出サービスと状態サービスを置き換える |
| [セッションランタイム](../examples/sdk/13-session-runtime.ts) | アクティブなセッションを安全に置き換える |
| [Codemode と MCP](../examples/sdk/14-codemode-mcp.ts) | `codemode`、`tool_search`、MCP 拡張機能を追加する |

<a id="exports"></a>

## リソース

- [モデルの選択](models.md)では、モデルの選択と互換性のあるエンドポイントについて説明しています。[プロバイダー認証](providers.md)では、認証情報とクラウドプロバイダーのセットアップについて説明しています。
- [構成](configuration.md)では、通常の検出と設定について説明しています。[設定](settings.md)には、すべての設定が一覧表示されています。
- [セッションとコンテキスト](sessions.md)では、セッションの動作について説明しています。[セッション形式](session-format.md)では、永続化されるエントリを定義しています。[メッセージ型](message-types.md)では、共有されるトランスクリプトの値を定義しています。
- [拡張機能](extensions.md)、[スキル](skills.md)、[プロンプトテンプレート](prompt-templates.md)では、`ResourceLoader` を通じて提供されるリソースについて説明しています。
- [CLI 統合](cli-integration.md)では、プロセス内 SDK 統合の代替となる print、JSON、RPC について説明しています。
