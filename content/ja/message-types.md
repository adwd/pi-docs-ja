# メッセージ型

Pi は、SDK の状態、ライフサイクルイベント、RPC レスポンス、永続化されたセッションメッセージのエントリで `AgentMessage` 値を使用します。このページでは、それらに共通するメッセージとそのコンテンツブロックを定義します。

メッセージのタイムスタンプは、ミリ秒単位の Unix タイムスタンプです。[セッションエントリ](session-format.md#entry-base)の ISO 8601 タイムスタンプとは異なります。

ソース定義：

- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) は、プロバイダー向けのメッセージとコンテンツブロックを定義します。
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) は、拡張可能な `AgentMessage` ユニオンを定義します。
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) は、コーディングエージェントのメッセージロールを追加します。

## コンテンツブロック

### TextContent

```typescript
interface TextContent {
  type: "text";
  text: string;
  textSignature?: string;
}
```

`textSignature` には、プロバイダー固有のメッセージメタデータが含まれます。不透明なデータとして扱ってください。

### ImageContent

```typescript
interface ImageContent {
  type: "image";
  data: string;
  mimeType: string;
}
```

`data` は、Base64 エンコードされた画像データです。`mimeType` は、`image/png` や `image/jpeg` などのメディアタイプを識別します。

### ThinkingContent

```typescript
interface ThinkingContent {
  type: "thinking";
  thinking: string;
  thinkingSignature?: string;
  redacted?: boolean;
}
```

思考シグネチャには、プロバイダー固有の再生データが含まれます。不透明なデータとして扱ってください。秘匿化されたブロックでは、`thinkingSignature` に暗号化されたペイロードを保持しながら、表示可能な思考テキストが存在しない場合があります。

### ToolCall

```typescript
interface ToolCall {
  type: "toolCall";
  id: string;
  name: string;
  arguments: Record<string, any>;
  thoughtSignature?: string;
  namespace?: string;
}
```

`thoughtSignature` はプロバイダー固有です。`namespace` は、動的に読み込まれたツールまたは名前空間付きツール用の OpenAI Responses 名前空間を識別します。

## 使用量

アシスタントメッセージには、常に使用量が含まれます。ツールがネストされたモデル処理を実行した場合、ツール結果にも使用量が含まれることがあります。

```typescript
interface Usage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  cacheWrite1h?: number;
  reasoning?: number;
  totalTokens: number;
  cost: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
}
```

`reasoning` が存在する場合、それはすでに `output` に含まれているため、再度加算しないでください。`cacheWrite1h` は、1 時間の保持期間で書き込まれた `cacheWrite` のサブセットです。

## 基本メッセージ

### SystemMessage

```typescript
interface SystemMessage {
  role: "system";
  content: string | TextContent[];
  sections?: Record<string, string | null>;
  toolsAdded?: Tool[];
  toolsRemoved?: ToolReference[];
  replace?: boolean;
  timestamp: number;
}
```

先頭のシステムメッセージは、初期プロンプトとツールを宣言します。後続のシステムメッセージでは、指示の追加、名前付きプロンプトセクションの置換または削除、およびツールの追加または削除が可能です。それらを順番に再生すると、現在の状態が得られます。`replace: true` を持つメッセージは、それ以前の状態を破棄し、完全に新しいベースラインを確立します。

### UserMessage

```typescript
interface UserMessage {
  role: "user";
  content: string | (TextContent | ImageContent)[];
  timestamp: number;
}
```

### AssistantMessage

```typescript
interface AssistantMessage {
  role: "assistant";
  content: (TextContent | ThinkingContent | ToolCall)[];
  api: string;
  provider: string;
  model: string;
  responseModel?: string;
  responseId?: string;
  providerThinkingLevel?: string;
  diagnostics?: AssistantMessageDiagnostic[];
  usage: Usage;
  stopReason: "pending" | "stop" | "length" | "toolUse" | "error" | "aborted" | "deferred";
  deferred?: DeferredHandle;
  errorMessage?: string;
  rawStopReason?: string;
  endTurn?: boolean;
  timestamp: number;
}
```

`responseModel` は、要求されたモデルと異なる場合に、実際にレスポンスを返したプロバイダーモデルを記録します。`responseId`、`providerThinkingLevel`、`diagnostics`、`rawStopReason` は、プロバイダーまたはランタイムの詳細を保持します。

`"pending"` は、ストリーミング中の部分的なアシスタントメッセージに使用されます。`message_end` 内の完了済みメッセージには終端の停止理由があり、Pi は `"pending"` のアシスタントメッセージをセッション JSONL に永続化しません。

`"deferred"` レスポンスには、その取得に必要なプロバイダーデータを持つ `DeferredHandle` があります：

```typescript
interface DeferredHandle {
  provider: string;
  modelId: string;
  api: string;
  id: string;
  expiresAt?: number;
  pollAfterMs?: number;
  data?: JsonValue;
}
```

### ToolResultMessage

```typescript
interface ToolResultMessage<TDetails = any> {
  role: "toolResult";
  toolCallId: string;
  toolName: string;
  content: (TextContent | ImageContent)[];
  details?: TDetails;
  usage?: Usage;
  isError: boolean;
  timestamp: number;
}
```

`details` はツール固有です。任意の `usage` は、ツールが実行したネストされたモデル処理を報告し、セッション全体の統計に算入されますが、メインのモデル呼び出しの使用量には含まれません。

## コーディングエージェントのメッセージ

コーディングエージェントパッケージは、`AgentMessage` を 4 つのロールで拡張します。

### BashExecutionMessage

RPC の [`bash`](rpc-commands.md#bash) コマンドを含む、直接実行されたシェルコマンドによって作成されます。これは LLM ツールの結果ではありません。

```typescript
interface BashExecutionMessage {
  role: "bashExecution";
  command: string;
  output: string;
  exitCode: number | undefined;
  cancelled: boolean;
  truncated: boolean;
  fullOutputPath?: string;
  excludeFromContext?: boolean;
  timestamp: number;
}
```

`excludeFromContext` が true でない限り、Pi は次のモデルリクエストの前に、このメッセージをユーザーロールのテキストへ変換します。

### CustomMessage

拡張機能がコンテキストメッセージを送信したときに作成されます。

```typescript
interface CustomMessage<T = unknown> {
  role: "custom";
  customType: string;
  content: string | (TextContent | ImageContent)[];
  display: boolean;
  details?: T;
  timestamp: number;
}
```

Pi は、モデルリクエスト用にそのコンテンツをユーザーメッセージへ変換します。`display` はターミナルでのレンダリングを制御し、`details` はモデルへ送信されません。

### BranchSummaryMessage

```typescript
interface BranchSummaryMessage {
  role: "branchSummary";
  summary: string;
  fromId: string | null;
  timestamp: number;
}
```

Pi は、永続化された `branch_summary` エントリからこのコンテキストメッセージを作成します。

### CompactionSummaryMessage

```typescript
interface CompactionSummaryMessage {
  role: "compactionSummary";
  summary: string;
  tokensBefore: number;
  timestamp: number;
}
```

Pi は、永続化された `compaction` エントリからこのコンテキストメッセージを作成します。

## AgentMessage ユニオン

コーディングエージェントでは、このユニオンは次と同等です：

```typescript
type AgentMessage =
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolResultMessage
  | BashExecutionMessage
  | CustomMessage
  | BranchSummaryMessage
  | CompactionSummaryMessage;
```

下位レベルのエージェントパッケージでは、`AgentMessage` は `Message | CustomAgentMessages[keyof CustomAgentMessages]` です。アプリケーションは TypeScript の宣言マージを通じてロールを追加できるため、拡張されたホストからのメッセージを受け入れるコンシューマーは、未知のカスタムロールを許容する必要があります。
