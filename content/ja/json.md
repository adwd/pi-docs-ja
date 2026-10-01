# JSONイベントストリーム

JSONモードは、1回の呼び出しについて構造化された進行状況を出力します。

```bash
pi --mode json "Review this repository"
```

Piは1つのセッションヘッダーに続けてセッションイベントを書き込み、指定されたプロンプトの処理が完了すると終了します。RPCモードは同じ形式のセッションイベントを出力しますが、双方向の長時間稼働プロトコルであるため、セッションヘッダーはありません。[RPCモード](rpc.md)を参照してください。

このページは、JSONモードとRPCモードで共有されるイベントの正式なリファレンスです。メッセージの値には[共有メッセージ型](message-types.md)を使用します。

## フレーミングとプロセスI/O

ストリームは厳密なJSONLフレーミングを使用します。各レコードは1つのJSONオブジェクトであり、LF（`\n`）で終端されます。レコードはLFのみで分割し、その直前にある省略可能なキャリッジリターンを取り除いてください。Unicodeの行区切り文字と段落区切り文字はJSON文字列内で有効であり、レコードの境界ではありません。

Node.jsの`readline`は、これらのUnicode区切り文字も認識するため、このストリームには適していません。バイトストリームまたはUTF-8ストリームのデコーダーを使用し、LFで分割してください。

stdoutを継続的に読み取ってください。レコードの読み取りを停止すると、パイプバッファーがいっぱいになったときにPiが停止する可能性があります。stdoutはJSONL専用です。診断情報とアプリケーションログはstderrに出力されます。

## セッションヘッダー

JSONモードの最初のレコードは、現在の[セッションヘッダー](session-format.md#sessionheader)です。

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path"}
```

RPCモードはこのレコードを出力しません。現在のセッションIDとファイルを取得するには、[`get_state`](rpc-commands.md#get_state)を使用してください。

## イベントシーケンス

基本的な実行では、次のようなレコードが生成されます。

```json
{"type":"agent_start"}
{"type":"turn_start"}
{"type":"message_start","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_end","message":{"role":"user","content":"Review this repository","timestamp":1733234401000}}
{"type":"message_start","message":{"role":"assistant","content":[],"stopReason":"pending","...":"..."}}
{"type":"message_update","usage":{"...":"..."},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello"}}
{"type":"message_end","message":{"role":"assistant","...":"..."}}
{"type":"turn_end","message":{"role":"assistant","...":"..."},"toolResults":[]}
{"type":"agent_end","messages":[{"...":"..."}],"willRetry":false}
{"type":"agent_settled"}
```

`agent_end`は、1回の低レベルなエージェント実行が終了したことを示します。その後も、自動再試行、オーバーフローからの回復、圧縮の再試行、ステアリング、またはフォローアップ処理が続く場合があります。`agent_settled`は、そのセッションレベルの実行について、Piに残っている自動処理がないことを示します。

## エージェントイベントとターンイベント

| イベント | フィールド | 意味 |
|---|---|---|
| `agent_start` | なし | 低レベルなエージェント実行が開始されました。 |
| `agent_end` | `messages`、`willRetry` | その低レベルな実行が終了しました。`messages`には、実行によって生成されたメッセージが含まれます。 |
| `agent_settled` | なし | Piは、再試行、圧縮からの回復、またはキュー内のメッセージの処理を自動的には続行しません。 |
| `turn_start` | なし | アシスタントの1ターンが開始されました。 |
| `turn_end` | `message`、`toolResults` | 1つのアシスタント応答と、それによって発生したツール呼び出しが完了しました。 |

1ターンは、1つのアシスタント応答と、その応答によって生成されたツール呼び出しおよびツール結果で構成されます。

## メッセージイベント

| イベント | フィールド | 意味 |
|---|---|---|
| `message_start` | `message` | メッセージが開始されました。 |
| `message_update` | `usage`、`assistantMessageEvent` | アシスタントメッセージがコンテンツブロックの更新を出力しました。 |
| `message_end` | `message` | メッセージが完了しました。これが正式な最終メッセージです。 |

### ストリーミングメッセージの再構築

通信上の`message_update`レコードには差分のみが含まれます。ストリームサイズを線形に保つため、SDKイベントの累積`message`フィールドと、すべての`assistantMessageEvent.partial`スナップショットは省略されます。

ネストされたイベントは、次のいずれかです。

| 型 | `type`以外のフィールド | 意味 |
|---|---|---|
| `start` | なし | プロバイダーのストリームが開始されました。累積`partial`フィールドは通信時に削除されます。 |
| `text_start` | `contentIndex` | テキストブロックが開始されました。 |
| `text_delta` | `contentIndex`、`delta` | ブロックにテキストを追加します。 |
| `text_end` | `contentIndex`、`content` | テキストブロックが確定済みコンテンツとともに終了しました。 |
| `thinking_start` | `contentIndex` | 思考ブロックが開始されました。 |
| `thinking_delta` | `contentIndex`、`delta` | ブロックに思考テキストを追加します。 |
| `thinking_end` | `contentIndex`、`content` | 思考ブロックが確定済みコンテンツとともに終了しました。 |
| `toolcall_start` | `contentIndex`、`id`、`toolName` | ツール呼び出しブロックが開始されました。 |
| `toolcall_delta` | `contentIndex`、`delta` | シリアライズされた引数データを追加します。 |
| `toolcall_end` | `contentIndex`、`toolCall` | ツール呼び出しが、完全な`ToolCall`とともに終了しました。 |
| `done` | `reason`、`message` | プロバイダーのストリームが正常に完了しました。 |
| `error` | `reason`、`error` | プロバイダーのストリームがエラーまたは中止メッセージとともに終了しました。 |

通常のエージェントループでは、プロバイダーレベルの`start`、`done`、`error`を`message_update`として出力するのではなく、`message_start`および`message_end`セッションイベントに変換します。これらは、一致するセッションイベントを構築する呼び出し元向けに、エクスポートされた`JsonAgentSessionEvent`変換では引き続き受け入れられます。

コンテンツブロックの識別には`contentIndex`を使用します。ライブ表示用に`delta`フィールドをバッファリングしますが、再構築したデータは`text_end`、`thinking_end`、または`toolcall_end`内の完了済みコンテンツで置き換えてください。`message_end.message`が到着したら、部分メッセージ全体をそれで置き換えてください。

トップレベルの`usage`は、そのアシスタント応答についてプロバイダーが報告した最新の累積使用量です。プロバイダーがストリーミング中に使用量を報告しない場合、完了するまでゼロのままになることがあります。

```json
{"type":"message_update","usage":{"input":100,"output":1,"cacheRead":0,"cacheWrite":0,"totalTokens":101,"cost":{"input":0,"output":0,"cacheRead":0,"cacheWrite":0,"total":0}},"assistantMessageEvent":{"type":"text_delta","contentIndex":0,"delta":"Hello "}}
```

## ツール実行イベント

| イベント | フィールド | 意味 |
|---|---|---|
| `tool_execution_start` | `toolCallId`、`toolName`、`args` | ツールの実行が開始されました。 |
| `tool_execution_update` | `toolCallId`、`toolName`、`args`、`partialResult` | ツールが部分的な結果を報告しました。 |
| `tool_execution_end` | `toolCallId`、`toolName`、`result`、`isError` | ツールの実行が完了しました。 |

ライフサイクルの対応付けには`toolCallId`を使用します。`partialResult`は、ツールから提供された最新の部分結果です。それが以前の更新を置き換えるか拡張するかは、そのツールの結果コントラクトによって異なります。

```json
{"type":"tool_execution_start","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"}}
{"type":"tool_execution_update","toolCallId":"call_abc123","toolName":"bash","args":{"command":"ls -la"},"partialResult":{"content":[{"type":"text","text":"partial output"}],"details":{}}}
{"type":"tool_execution_end","toolCallId":"call_abc123","toolName":"bash","result":{"content":[{"type":"text","text":"complete output"}],"details":{}},"isError":false}
```

## キューイベントと状態イベント

| イベント | フィールド | 意味 |
|---|---|---|
| `queue_update` | `steering`、`followUp` | 保留中のステアリングまたはフォローアップのキューが変更されました。両方のフィールドに、現在のキュー全体が含まれます。 |
| `entry_appended` | `entry` | 拡張機能が`pi.appendEntry()`を介してカスタムセッションエントリを追加しました。 |
| `session_info_changed` | `name` | セッションの表示名が変更されました。`name`が存在しない場合は、表示名がクリアされたことを示します。 |
| `thinking_level_changed` | `level` | 有効な思考レベルが変更されました。 |

`entry`の値には、永続化される[セッションエントリ型](session-format.md#entry-types)を使用します。

## 圧縮イベント

`compaction_start`は、圧縮が開始された理由を報告します。

```json
{"type":"compaction_start","reason":"threshold"}
```

`reason`は、`"manual"`、`"threshold"`、または`"overflow"`です。

圧縮が成功すると、`compaction_end`に結果が含まれます。

```json
{
  "type": "compaction_end",
  "reason": "threshold",
  "result": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {"...": "..."},
    "details": {}
  },
  "aborted": false,
  "willRetry": false
}
```

圧縮が中止された場合、`result`は存在せず、`aborted`はtrueです。圧縮に失敗した場合、`result`は存在せず、`aborted`はfalseで、`errorMessage`に失敗の説明が含まれます。オーバーフローからの回復に成功した場合、Piがプロンプトを再試行する前に`willRetry`がtrueに設定されます。

結果のセマンティクスについては、[圧縮と分岐の要約](compaction.md)を参照してください。

## 再試行イベント

アシスタントターンの再試行では、次のイベントが出力されます。

```json
{"type":"auto_retry_start","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"529 overloaded"}
{"type":"auto_retry_end","success":true,"attempt":2}
```

最終的に失敗した場合、`auto_retry_end`には`success: false`と`finalError`文字列が含まれます。

圧縮と分岐の要約の再試行では、次のイベントが出力されます。

```json
{"type":"summarization_retry_scheduled","attempt":1,"maxAttempts":3,"delayMs":2000,"errorMessage":"terminated"}
{"type":"summarization_retry_attempt_start","source":"compaction","reason":"threshold"}
{"type":"summarization_retry_finished"}
```

分岐の要約では、`source`は`"branchSummary"`であり、`reason`は存在しません。圧縮の再試行における`reason`は、`"manual"`、`"threshold"`、または`"overflow"`です。

## RPC専用イベント

直接実行するRPCの[`bash`](rpc-commands.md#bash)コマンドは、出力チャンクごとに1つの`bash_execution_update`を出力します。省略可能な`id`はコマンドIDと一致します。最終的なコマンド応答では出力が切り詰められる場合がありますが、これらのイベントではすべての出力がストリーミングされます。

```json
{"type":"bash_execution_update","id":"req-1","delta":"total 48\n"}
```

RPCでは、拡張機能のハンドラーが例外をスローしたときに`extension_error`も追加されます。

```json
{"type":"extension_error","extensionPath":"/path/to/extension.ts","event":"tool_call","error":"Error message"}
```

拡張機能UIのレコードは独立したRPCサブプロトコルであり、`AgentSessionEvent`の値ではありません。[RPC拡張機能UI](rpc-extension-ui.md)を参照してください。

## TypeScriptの型

SDKの`AgentSessionEvent`には、インプロセスのコンシューマー向けの累積ストリーミングスナップショットが含まれます。JSONとRPCは`message_update`のみを変換します。

```typescript
type WithoutPartial<T> = T extends { partial: unknown } ? Omit<T, "partial"> : T;

type JsonAssistantMessageEvent<T> = T extends { type: "toolcall_start"; partial: unknown }
  ? WithoutPartial<T> & { id: string; toolName: string }
  : WithoutPartial<T>;

type JsonAgentSessionEvent =
  | Exclude<AgentSessionEvent, { type: "message_update" }>
  | {
      type: "message_update";
      usage: Usage;
      assistantMessageEvent: JsonAssistantMessageEvent<AssistantMessageEvent>;
    };
```

`@earendil-works/pi-coding-agent`からエクスポートされる`JsonAgentSessionEvent`型を使用してください。その実装は[`json-event.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/json-event.ts)にあります。

## 例

1回限りの実行で完了したメッセージを出力します。

```bash
pi --mode json "List files" 2>/dev/null | jq -c 'select(.type == "message_end")'
```
