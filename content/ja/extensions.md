# 拡張機能

拡張機能は、Pi に実行可能な動作を追加する TypeScript モジュールです。ワークフローに指示だけでなく、ツール、コマンド、イベントハンドラー、モデルプロバイダー、セッション状態、ターミナル UI が必要な場合に使用します。

拡張機能は、Pi プロセス内で同じオペレーティングシステム権限を使って実行されます。プロンプト、ツール呼び出し、ファイル、認証情報、セッション履歴を調査できるため、信頼できる提供元の拡張機能のみを読み込んでください。

一般的な拡張機能は、エージェントツールの追加、パスの保護、危険なコマンドの確認、セッションイベントへの反応、コンテキストの変更、コマンドの公開、永続的なステータスの表示などを行います。

<a id="quick-start"></a>
<a id="writing-an-extension"></a>
<a id="create-an-extension"></a>

## 拡張機能の作成と読み込み

拡張機能は、`ExtensionAPI` を受け取るデフォルトファクトリーをエクスポートします。このファクトリーは、現在の拡張機能ランタイムに機能を登録します。

`~/.pi/agent/extensions/hello.ts` を作成します。

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Show a greeting",
    handler: async (name, ctx) => {
      ctx.ui.notify(`Hello, ${name || "world"}!`, "info");
    },
  });
}
```

Pi を起動し、`/hello` を実行します。開発中は、ファイルを直接読み込みます。

```bash
pi --extension ./hello.ts
```

Pi は `jiti` を使用するため、ローカルの TypeScript 拡張機能に別途コンパイル手順は必要ありません。配布する拡張機能と依存関係には [Pi パッケージ](packages.md)を使用してください。

<a id="extension-locations"></a>
<a id="available-imports"></a>
<a id="choose-where-it-loads"></a>

## Pi に追加する

拡張機能をユーザーまたはプロジェクトの拡張機能ディレクトリに配置します。Pi は、TypeScript または JavaScript のファイルを直接読み込むほか、`index.ts` または `index.js` エントリーポイントを含むサブディレクトリも読み込みます。

小規模な拡張機能には単一ファイルを使用し、複数ファイルによる実装にはディレクトリを使用します。npm の依存関係は近くの `package.json` に記述します。標準的な場所については[設定](configuration.md)、追加のパスについては[設定項目](settings.md#resources)を参照してください。

再読み込みによって拡張機能ランタイムが置き換えられるため、`await ctx.reload()` より後のコードで古いランタイムの状態を再利用してはいけません。プロジェクトの拡張機能が読み込まれる前に実行される `project_trust` イベントに参加できるのは、個人用およびコマンドラインで明示的に指定した拡張機能だけです。

<a id="understand-the-lifecycle"></a>

## ランタイムのライフサイクルに従う

ファクトリーは同期にも非同期にもできます。Pi は非同期ファクトリーの完了を待ってから起動を続行するため、起動時に必要な設定の取得やプロバイダーの登録が可能です。

一部の呼び出しではセッションを開始せずに拡張機能を読み込むため、ファクトリー内でプロセス、ソケット、ウォッチャー、タイマーを開始しないでください。
長時間存続するリソースは、`session_start`、またはそれを必要とするコマンドやツールから開始してください。
セッションスコープのリソースは、冪等な `session_shutdown` ハンドラーで閉じてください。

実行は、入力と `before_agent_start` から始まり、モデル、メッセージ、ツールのイベントを経て `agent_end` に至ります。
その後も、自動再試行、復旧、圧縮、キューに入った処理が続く場合があります。
<a id="agent_start--agent_end--agent_before_settle--agent_settled"></a>

`agent_before_settle` は、操作可能な最後の境界です。エントリを追加し、1 回の継続を要求できます。
`agent_settled` は最終かつ通知専用です。Pi が自動的には続行しないことをインテグレーション側で把握する必要がある場合に使用します。

<a id="extensionapi-methods"></a>

## 統合ポイントの選択

| 機能 | 主要 API |
|---|---|
| ライフサイクルの動作を監視または変更する | `pi.on()` |
| モデルから呼び出せる操作を追加する | `pi.registerTool()` |
| `/` コマンドを追加する | `pi.registerCommand()` |
| ショートカットまたは CLI フラグを追加する | `pi.registerShortcut()` または `pi.registerFlag()` |
| ユーザーメッセージまたはカスタムメッセージを送信する | `pi.sendUserMessage()` または `pi.sendMessage()` |
| コンテキストに含まれないセッションデータを永続化する | `pi.appendEntry()` |
| アクティブなツール、モデル、思考レベルを変更する | `pi` のセッション制御メソッド |
| モデルプロバイダーを追加する | `pi.registerProvider()` |
| MCP サーバーを追加する | `pi.registerMcpServer()` |
| 各リクエストをモデルにルーティングする | [`pi.registerVirtualModel()`](virtual-models.md) |
| ターミナルレンダリングを追加する | レンダラー登録と `ctx.ui` |
| 別の拡張機能と通信する | `pi.events` |

イベント、コンテキスト、ツール、結果の正確な型については、[`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) でエクスポートされている宣言を使用してください。

## 拡張機能の規約に従う

<a id="events"></a>
<a id="work-with-events"></a>

### イベントと並行処理

ハンドラーは、拡張機能の読み込み順および登録順に実行されます。`pi.on()` は、その登録を解除する関数を返します。変更は、すでに進行中のディスパッチには影響しません。
通知を行うイベントもあれば、データの変換、結果の置換、操作のキャンセルを行うイベントもあります。
すべての戻り値に効果があると想定せず、各イベントで宣言された結果型を使用してください。

イベントは、リソース検出、セッション、エージェントとメッセージのライフサイクル、プロバイダー、ツール、生の入力を対象とします。

`before_agent_start` は、現在のプロンプトと、その構造化された `systemPromptOptions` の両方を公開します。Pi がトランスクリプトの差分を追加できるように、プロンプトのセクション、選択したツール、ガイドラインを変更する方法を推奨します。`systemPrompt` を返すか `forceSystemPrompt` を設定すると、その実行のプロンプト全体が置き換えられますが、トランスクリプトには構造化されたセクションが引き続き記録されます。プロバイダーは、強制指定されたテキストを先頭のシステムプロンプトとして受け取ります。

`message_end` は、確定済みメッセージのロールを維持したまま、そのメッセージを置き換えられます。`tool_call` は、入力を変更したり実行をブロックしたりできます。`tool_result` ハンドラーは合成され、各ハンドラーにはそれ以前の変更が反映されます。

<a id="provider_stream_event"></a>

`provider_stream_event` は、解析されたプロバイダーのストリームイベントごとに、Pi が正規化する前に発生します。このイベントは、プロバイダー、API、モデルを識別します。`event.data` は Pi が利用できる最初の構造化された値であり、元の HTTP バイトや SSE フレームとは限りません。変更すると正規化に影響する可能性があるため、読み取り専用として扱ってください。このイベントは通知専用で、永続化されません。

ハンドラーはストリーム順に待機されるため、遅いハンドラーはストリームの消費を遅らせます。ハンドラーのエラーは、プロバイダーのレスポンスを変更せずに報告されます。生のイベントをアシスタントメッセージごとにグループ化するオプトインのビューアーについては、[`debug-provider.ts`](../examples/extensions/debug-provider.ts) を参照してください。

<a id="context_with_system"></a>

`context` は、プロンプトおよびツールのシステムメッセージを含めずに会話メッセージを変換します。その後、Pi がその状態を復元します。リクエストローカルな変換でトランスクリプト全体を管理する必要がある場合にのみ `context_with_system` を使用し、インデックス 0 にはシステムメッセージを維持してください。

`turn_end` と `agent_before_settle` は操作可能な境界です。これらのハンドラーは、提案された `custom`、`custom_message`、`context_edit`、`compaction` の各エントリを連鎖させ、次のモデルリクエストを 1 回行うために `continue: true` を返せます。無条件の継続はループする可能性があるため、継続条件をガードしてください。検証と順序付けに関する完全な規約については、エクスポートされたイベント宣言を使用してください。

<a id="cache_warming_decision"></a>

`cache_warming_decision` は、アイドル時のプロンプトキャッシュ更新を `{ action: "warm" }` または `{ action: "stop" }` で上書きできます。アクションを返した最後のハンドラーが優先されます。

1 つのアシスタントメッセージからのツール呼び出しは、並列実行される場合があります。
別のツールイベントの実行時に、同階層の呼び出しや結果が存在すると想定しないでください。
アクティブなターンに属するネストされた処理には `ctx.signal` を使用してください。コマンドやアイドル状態のセッションイベントには、操作シグナルがないことがよくあります。

`undefined` を返す `user_bash` ハンドラーは、コマンドを次のハンドラーに渡し、どのハンドラーも処理しなければローカル実行に渡します。`operations` または `result` を返すと、伝播が停止します。ハンドラーが失敗した場合、ローカル実行へフォールスルーせず、コマンドはブロックされます。

<a id="custom-tools"></a>
<a id="register-tools"></a>

### ツール

カスタムツールでは、名前、モデル向けの説明、TypeBox パラメータスキーマ、`execute()` 関数を定義します。
その結果には、モデル向けの `content` と、レンダリングまたは状態の再構築に使用する `details` フィールドが必要です。
構造化された詳細がない場合は `details: undefined` を使用します。ツールがネストされたモデル呼び出しを行う場合は、セッションの合計値を正確に保つため、その `usage` を結果に含めてください。

失敗したツール結果を生成するには、`execute()` から例外をスローします。
オブジェクトを返しても、エラーとしてマークされません。
そのバッチ内で完了したすべてのツールが終了に同意した後、エージェントが自動フォローアップをスキップすべき場合にのみ `terminate: true` を返してください。

ツールが変更可能なメモリ内状態を共有する場合は、逐次実行を使用してください。
ファイルを変更するツールでは、読み取り・変更・書き込みの操作全体を `withFileMutationQueue()` でラップする必要があります。
モデル向けの大きな結果は切り詰め、完全な出力を読み取れる場所をモデルに伝えてください。

結果がデータの場合は `outputSchema` を宣言し、それに一致する `structuredContent` を返します。モデルは引き続き `content` を受け取りますが、codemode スクリプトなどのプログラムによる呼び出し元は、テキストの代わりに `structuredContent` を受け取ります。`outputSchema` のないツールは、そのテキスト内容がスクリプトに渡されます。データを保持したまま失敗を報告するには、例外をスローする代わりに `isError: true` を含む結果を返します。モデルにはエラーが表示され、スクリプトは引き続き `structuredContent` を受け取ります。

ツールは `ctx.executeTool(name, args, { signal, onUpdate })` を使って他のツールを実行できます。ネストされた呼び出しは、モデルが発行した呼び出しと同様に、引数検証、`tool_call` ハンドラー、`tool_result` ハンドラーを通過し、`tool_execution_start`、`tool_execution_update`、`tool_execution_end` を発行します。これらのイベントはすべて `parentToolCallId` を保持し、その `toolCallId` は pi によって `<parent id>/<n>` として割り当てられます。これらの ID は、トランスクリプトにツール呼び出しやツール結果として現れません。ネストされた呼び出しはトランスクリプトのエントリを追加しません。その結果は呼び出し元のツールにのみ渡り、呼び出し元が `onUpdate` や `details` などを通じて自ら報告します。セッションは、呼び出し元ツールの結果メッセージに `nestedCalls` として、呼び出しの記録（名前、引数、ステータス、所要時間、エラー。結果は含まれません）を上限付きで保持します。これは圧縮時のファイル一覧に使用され、HTML エクスポートに表示されます。呼び出しごとに 8 KiB、またはツール結果ごとに 32 KiB を超える引数は省略され、最大 256 件の呼び出しが保持されます。何かが失われた記録には `complete: false` が付けられます。すべての深さにおけるネストされた結果の `usage` は、呼び出し元ツールの結果の `usage` に加算されます。そのため、ツールが報告するのは自身の使用量のみであり、呼び出したツールの使用量は含まれません。`ctx.tools` は、`ctx.executeTool()` が呼び出せるツールを列挙します。`content` を編集して除去する `tool_result` ハンドラーは、`structuredContent` も置き換える必要があります。`content` だけを置き換えると、それは破棄されます。

[`hello.ts`](../examples/extensions/hello.ts)、[`todo.ts`](../examples/extensions/todo.ts)、[`dynamic-tools.ts`](../examples/extensions/dynamic-tools.ts)、[`truncated-tool.ts`](../examples/extensions/truncated-tool.ts) を参照してください。

### ツールの公開

`exposure` は、モデルがツールを利用する方法を制御します。「呼び出し可能」とは、`codemode` ツールのスクリプトと同様に、他のツールから `ctx.executeTool()`（`ctx.tools`）を通じて呼び出せることを意味します。

- `direct`（デフォルト）：アクティブな間はモデルに宣言され、呼び出し可能です。
- `model-only`：アクティブな間はモデルに宣言されますが、呼び出しは一切できません。他のツールをオーケストレーションするツールや、ユーザーに質問するツールに使用します。
- `codemode`：登録されている間は常に呼び出し可能で、`codemode` ツールによって一覧表示されます。明示的にアクティブ化しない限り、モデルには宣言されません。
- `deferred`：`codemode` と同様ですが、codemode ツールの一覧には表示されません。`tool_search` で検出してアクティブ化できます。
- `hidden`：登録されていますが、アクセスできません。ツールの登録は解除できないため、撤回するには `exposure: "hidden"` を指定して再登録します。

`namespace: { name, description, instructions }` は、MCP サーバーと同様に、関連するツールをグループ化します。Codemode ツールは、1 つの見出しの下に名前空間とその `description` を一覧表示します。`instructions` には、より詳しい使用方法のガイダンスを格納します。これは一覧には表示されず、codemode スクリプトは `describeNamespace(name)` を使って読み取ります。

`direct` または `model-only` のツールを登録すると、そのツールがアクティブ化されます。他の公開方法では、登録時にアクティブ化されません。アクティブなセット（`pi.getActiveTools()`、`pi.setActiveTools()`）は、モデルに宣言されるツールのセットです。`pi.getAllTools()` は、各ツールの `exposure`、`namespace`、`annotations` を報告します。

`annotations` は、ツールの動作に関するヒントで、MCP ツールアノテーションと同じ意味を持ちます。`readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint` があります。MCP ツールは、サーバーが宣言したヒントを保持します。ヒントがない場合は MCP のデフォルトが適用されます。つまり、ツールは読み取り専用ではなく、破壊的な操作を行い、オープンワールドにアクセスする可能性があります。ヒントは検証されませんが、権限を扱う拡張機能は、確認する呼び出しの判断にヒントを利用できます。次の例では、Codex が承認を求める呼び出しを確認します。

```typescript
pi.on("tool_call", async (event, ctx) => {
  const hints = pi.getAllTools().find((tool) => tool.name === event.toolName)?.annotations;
  const needsApproval =
    hints?.destructiveHint === true ||
    (!hints?.readOnlyHint && ((hints?.destructiveHint ?? true) || (hints?.openWorldHint ?? true)));
  if (needsApproval && !(await ctx.ui.confirm("Allow tool call?", event.toolName))) {
    return { block: true, reason: `${event.toolName} was not approved` };
  }
});
```

他のツールをオーケストレーションするツールは、アクティブな間、`prepareLoadout(loadout)` を使ってモデルに表示される内容を調整できます。これはアクティブなツールが変更されるたびに実行され、宣言されたツール、呼び出し可能なツール、および公開方法と名前空間を含む登録済みの全ツールを受け取ります。そして、宣言されるツール（自身を含む）の代替 `descriptions` と `hiddenDeclarations` を返します。後者は、アクティブかつ呼び出し可能な状態を維持しながら、リクエストで宣言を省略するアクティブなツールです。`codemode` は、このフック、`exposure`、`ctx.executeTool()` のみを使用するため、別のツールが異なる名前で同じ動作を実装できます。

### ツールの動的なアクティブ化

最初にすべてのツールを登録し、任意のツールは非アクティブに保ち、ローダーツールから `pi.setActiveTools()` を使用して、目的のアクティブなツールを選択します。名前は事前に登録されている必要があります。不明な名前は無視されます。

Pi は、最初のプロンプトとツールセットをトランスクリプトの最初のシステムメッセージに記録し、次のモデルリクエストの前にツールとプロンプトの変更を追加します。この遷移を表現できないプロバイダーは完全なトランスクリプトのチェックポイントを受け取るため、キャッシュされたプレフィックスが無効になる場合があります。

### MCP サーバー

`pi.registerMcpServer(name, config)` は、現在のセッションに MCP サーバーを追加します。`config` は、[`mcp.json`](mcp.md) 内の `mcpServers` エントリと同じ形式です。stdio サーバーには `command`、`args`、`env`、`cwd`、HTTP サーバーには `url`、`headers`、`oauth` を使用し、さらに `exposure`、`toolExposure`、`description`、`enabled`、`timeout` を指定できます。

```typescript
pi.registerMcpServer("jira", { url: "https://mcp.example.com/jira", exposure: "codemode" });
pi.unregisterMcpServer("jira");
```

拡張機能の読み込み中に登録されたサーバーは、セッション開始時に `mcp.json` のサーバーとともに接続されます。後から登録されたサーバーは直ちに接続され、`pi.unregisterMcpServer()` は接続を閉じて、そのサーバーのツールにアクセスできないようにします。登録内容は保存されません。たとえば拡張機能独自の設定に基づいて、読み込みのたびに再登録してください。`mcp.json` に同名のサーバーがある場合はそちらが優先され、`/mcp` に上書きが表示されます。同じ名前を再度登録すると、その拡張機能による以前の登録が置き換えられます。別の拡張機能が登録した名前、無効な名前、無効な設定では例外がスローされます。

組み込みの MCP サポートは、登録されたサーバーに接続します。別の拡張機能に置き換えられたために何も接続を行わない場合（[MCP](mcp.md#other-mcp-extensions) を参照）、各登録は拡張機能エラーとして報告されます。他の MCP 拡張機能も、登録されたサーバーに接続できます。`session_start` で `pi.getMcpServers()` を使ってサーバーを読み取り、後続の変更には `mcp_servers_change` イベントを処理します。

<a id="extensioncontext"></a>
<a id="extensioncommandcontext"></a>
<a id="use-extension-context"></a>

### コンテキストとセッションの変更

`ExtensionContext` は、作業ディレクトリ、モード、UI、セッションマネージャー、モデルランタイム、中止シグナル、コンテキスト使用量、および圧縮とシャットダウンの制御機能を提供します。
プロバイダーに依存しないネストされたモデル呼び出しには、`ctx.modelRegistry.streamSimple()` を使用してください。

コマンドハンドラーは `ExtensionCommandContext` を受け取ります。これにより、アイドル状態になるまでの待機、再読み込み、ツリーの移動、セッションの置換を行う操作が追加されます。
これらの操作をライフサイクルハンドラーから呼び出すとランタイムがデッドロックする可能性があるため、コマンド専用です。

セッションを置き換えると、古いコンテキストは無効になります。切り替え前にはプレーンデータだけを取得し、その後、セッションに結び付いた処理には `withSession` に渡される新しいコンテキストを使用してください。

<a id="state-management"></a>
<a id="persist-state"></a>

### 状態

状態が会話にどのように関与するかに基づいて、保存先を選択します。

| 状態 | 保存先 |
|---|---|
| アクティブな分岐に追従するツール状態 | ツール結果の `details` |
| モデルのコンテキストから除外される永続データ | `pi.appendEntry()` |
| 保存され、モデルに送信されるカスタムコンテンツ | `pi.sendMessage()` |
| 1 つのセッションの外部にあるデータ | 外部ストレージ |

`session_start` の実行中に、`ctx.sessionManager.getBranch()` から分岐依存の状態を再構築します。
放棄された分岐は別の履歴を表すため、すべてのファイルエントリから再構築しないでください。
保存されたカスタムコンテンツをトランスクリプトに表示する必要がある場合は、エントリまたはメッセージのレンダラーを登録します。

<a id="custom-ui"></a>
<a id="mode-behavior"></a>
<a id="interact-with-the-user"></a>
<a id="account-for-each-mode"></a>

### UI とモード

`ctx.ui` は、ダイアログ、通知、ステータステキスト、ウィジェット、タイトル、エディターへのアクセス、カスタムコンポーネントを提供します。
独自のレンダリングと入力が必要な操作にのみ `ctx.ui.custom()` を使用してください。
コンポーネント、フォーカス、オーバーレイ、テーマ、パフォーマンスに関するガイダンスについては、[ターミナル UI](tui.md) を参照してください。

拡張機能は、対話、RPC、JSON、printの各モードで読み込まれます。
対話モードでは、完全なターミナルUIを利用できます。
RPCでは、サポートされているダイアログと通知を[RPC拡張機能UIプロトコル](rpc-extension-ui.md)経由で転送できますが、カスタムターミナルコンポーネントは転送できません。JSONモードとprintモードにはUIがありません。
ターミナル専用の動作は`ctx.mode === "tui"`でガードし、対話クライアントとRPCクライアントでサポートされる操作には`ctx.hasUI`を使用します。

非対話モードでも機能するように、ツールとイベントの動作をレンダリングから独立させます。

<a id="error-handling"></a>
<a id="handle-errors-and-shutdown"></a>

### エラーとクリーンアップ

Piはハンドラーのエラーを報告し、可能な場合は処理を続行します。`tool_call`ハンドラーの失敗時には、フェイルセーフとしてツールがブロックされます。ツール実行の失敗は、モデルに対するエラー結果になります。

通常の動作でクリーンアップを試みた場合でも、`session_shutdown`でリソースを解放します。
キャンセル、再読み込み、セッションの置き換え、プロセスの終了が同じ処理経路に集約される可能性があるため、クリーンアップは冪等にします。
`ctx.shutdown()`を使用して、プロセスの正常なシャットダウンを要求します。

<a id="examples-reference"></a>
<a id="use-examples-as-the-implementation-reference"></a>

## 例とリファレンス

確認済みの[拡張機能の例](../examples/extensions/)では、ツール、ライフサイクルイベント、コマンド、フラグ、ショートカット、状態、レンダリング、プロバイダー、OAuth、リモート実行、ターミナルコンポーネントを扱っています。
まず、統合ポイントに合う最小の例から始めます。

モデルサービスの統合には[カスタムプロバイダー](custom-provider.md)、カスタムコンポーネントには[ターミナルUI](tui.md)、他のリソースとともに拡張機能をインストールまたは配布するには[Piパッケージ](packages.md)を使用します。
