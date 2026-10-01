# セッションファイル形式

セッションは JSONL（JSON Lines）ファイルとして保存されます。各行は `type` フィールドを持つ JSON オブジェクトです。セッションエントリは `id`/`parentId` フィールドによってツリー構造を形成するため、新しいファイルを作成せずにその場で分岐できます。

プログラムによる作成、永続化、ツリーの移動については、[`SessionManager` API](sdk.md#sessionmanager-api) を参照してください。


## ファイルの場所

```
~/.pi/agent/sessions/--<path>--/<timestamp>_<session-id>.jsonl
```

デフォルトでは、`<session-id>` は UUID です。呼び出し元は SDK または `--session-id` を通じてカスタム ID を指定できます。`<path>` については、Pi は先頭のパス区切り文字を削除し、`/`、`\\`、`:` を `-` に置き換えます。

## セッションの削除

`~/.pi/agent/sessions/` 配下の `.jsonl` ファイルを削除すると、セッションを削除できます。

Pi では、`/resume` から対話的にセッションを削除することもできます（セッションを選択して `Ctrl+D` を押し、確認します）。利用可能な場合、pi は完全な削除を避けるために `trash` CLI を使用します。

## セッションのバージョン

セッションのヘッダーにはバージョンフィールドがあります。

- **バージョン 1**：線形のエントリシーケンス（レガシー。読み込み時に自動移行）
- **バージョン 2**：`id`/`parentId` でリンクされたツリー構造
- **バージョン 3**：`hookMessage` ロールを `custom` に改名（拡張機能の統一）

既存のセッションは、読み込み時に現在のバージョン（v3）へ自動的に移行されます。

## ソースファイル

GitHub 上のソース（[pi](https://github.com/earendil-works/pi)）：
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - セッションエントリ型と SessionManager
- [メッセージ型](message-types.md) - 共有メッセージとコンテンツブロックのリファレンス
- [`packages/coding-agent/src/core/messages.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/messages.ts) - 拡張メッセージ型
- [`packages/ai/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/ai/src/types.ts) - 基本メッセージ型とコンテンツブロック型
- [`packages/agent/src/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/agent/src/types.ts) - 拡張可能な `AgentMessage` ユニオン

プロジェクト内の TypeScript 定義については、`node_modules/@earendil-works/pi-coding-agent/dist/` と `node_modules/@earendil-works/pi-ai/dist/` を確認してください。

## メッセージ

`message` エントリは [`AgentMessage`](message-types.md) を格納します。メッセージのコンテンツブロック、ロール、使用量、メッセージのタイムスタンプは、[メッセージ型](message-types.md) で定義されています。

セッションエントリのタイムスタンプは ISO 8601 文字列です。ネストされたメッセージのタイムスタンプは、ミリ秒単位の Unix タイムスタンプです。

## エントリの基底

すべてのエントリ（`SessionHeader` を除く）は `SessionEntryBase` を拡張します。

```typescript
interface SessionEntryBase {
  type: string;
  id: string;           // Usually an 8-char hex ID; may fall back to a full UUID
  parentId: string | null;  // Parent entry ID (null for a root entry)
  timestamp: string;    // ISO timestamp
}
```

## エントリ型

### SessionHeader

ファイルの先頭行です。メタデータのみで、ツリーには含まれません（`id`/`parentId` はありません）。

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project"}
```

親を持つセッション（`/fork`、`/clone`、または `newSession({ parentSession })` で作成）の場合：

```json
{"type":"session","version":3,"id":"uuid","timestamp":"2024-12-03T14:00:00.000Z","cwd":"/path/to/project","parentSession":"/path/to/original/session.jsonl"}
```

### SessionMessageEntry

会話内のメッセージです。`message` フィールドには `AgentMessage` が含まれます。システムメッセージにはプロンプトとツール構成が含まれます。セッションの最初のリクエストでは、すべてのプロンプトセクションとツール宣言を含むシステムメッセージが永続化され、それ以降の変更は、名前により `sections` にパッチを適用し（`null` は対象を削除）、`toolsAdded`/`toolsRemoved` を列挙するシステムメッセージとして永続化されます。これらを順番に再生すると現在のプロンプトとツールが得られます。個別のプロンプト状態エントリはありません。

```json
{"type":"message","id":"a0b1c2d3","parentId":null,"timestamp":"2024-12-03T14:00:00.000Z","message":{"role":"system","content":"","sections":{"preamble":"You are an expert coding assistant...","tools":"<tools>\n- read: ...\n</tools>","cwd":"/project"},"toolsAdded":[{"name":"read","description":"...","parameters":{}}],"timestamp":1733234400000}}
{"type":"message","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:04:00.000Z","message":{"role":"system","content":"","sections":{"skills":"<skills>...</skills>"},"toolsRemoved":[{"name":"write"}],"timestamp":1733234640000}}
```

システムメッセージが導入される前に作成されたセッションには、先頭のシステムメッセージがありません。最初のリクエストで現在のプロンプトが後続のシステムメッセージとして宣言され、同じ方法で再生されます。

```json
{"type":"message","id":"a1b2c3d4","parentId":"prev1234","timestamp":"2024-12-03T14:00:01.000Z","message":{"role":"user","content":"Hello","timestamp":1733234401000}}
{"type":"message","id":"b2c3d4e5","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}],"api":"anthropic-messages","provider":"anthropic","model":"claude-sonnet-4-5","usage":{...},"stopReason":"stop","timestamp":1733234402000}}
{"type":"message","id":"c3d4e5f6","parentId":"b2c3d4e5","timestamp":"2024-12-03T14:00:03.000Z","message":{"role":"toolResult","toolCallId":"call_123","toolName":"bash","content":[{"type":"text","text":"output"}],"isError":false,"timestamp":1733234403000}}
```

アシスタントメッセージには、その生成に使用されたモデル名が記録されます。新しいメッセージには、その応答で要求された Pi の思考レベルである `thinkingLevel` も記録されます。

### ModelChangeEntry

ユーザーがセッションの途中でモデルを切り替えたときに生成されます。最新のエントリが選択中のモデルであり、[仮想モデル](virtual-models.md) の場合もあります。その後、アシスタントメッセージには応答した物理モデルの名前が記録されます。

```json
{"type":"model_change","id":"d4e5f6g7","parentId":"c3d4e5f6","timestamp":"2024-12-03T14:05:00.000Z","provider":"openai","modelId":"gpt-4o"}
```

### ThinkingLevelChangeEntry

ユーザーが思考・推論レベルを変更したときに生成されます。

```json
{"type":"thinking_level_change","id":"e5f6g7h8","parentId":"d4e5f6g7","timestamp":"2024-12-03T14:06:00.000Z","thinkingLevel":"high"}
```

### UsageEntry

アシスタントメッセージではなく、LLM コンテキストにも含まれない、モデルに帰属する使用量を記録します。`kind` は操作を識別する任意の文字列です。たとえば、キャッシュウォーミングでは `"cache_warm"` を使用します。

```json
{"type":"usage","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:08:00.000Z","kind":"cache_warm","provider":"anthropic","model":"claude-sonnet-4-5","usage":{"input":0,"output":0,"cacheRead":50000,"cacheWrite":0,"totalTokens":50000,"cost":{"input":0,"output":0,"cacheRead":0.015,"cacheWrite":0,"total":0.015}}}
```

使用量エントリは、セッションのトークン数とコストの合計に加算されます。Pi はこれらを会話ツリーで非表示にします。コンシューマーは、未知の `kind` 値を拒否せず、通常の使用量として扱う必要があります。

### CompactionEntry

コンテキストが圧縮されたときに作成されます。以前のメッセージの要約と、完全なシステムプロンプト／ツールのチェックポイントを格納します。

```json
{"type":"compaction","id":"f6g7h8i9","parentId":"e5f6g7h8","timestamp":"2024-12-03T14:10:00.000Z","summary":"User discussed X, Y, Z...","firstKeptEntryId":"c3d4e5f6","tokensBefore":50000,"systemMessage":{"role":"system","content":"You are a coding assistant.","toolsAdded":[],"timestamp":1733235000000}}
```

`firstKeptEntryId` は必須です。圧縮エントリより前から保持される最初のエントリを識別します。コンテキストを再構築する際、Pi は要約済みの古いエントリを圧縮の要約に置き換え、このエントリから始まる範囲を保持します。何も保持しない圧縮では、このフィールドに自身の ID が格納されるため、先行するエントリは保持されません。

任意のフィールド：
- `systemMessage`：圧縮境界で再生されるプロンプトセクションとツール宣言。圧縮されたコンテキストの先頭のシステムメッセージになり、保持されたエントリ内のシステムメッセージよりも優先され、それらは破棄されます。古いセッションエントリには存在しません。
- `usage`：要約生成時の LLM 使用量。セッションのトークン数とコストの合計に含まれます
- `details`：実装固有のデータ（例：デフォルトでは `{ readFiles: string[], modifiedFiles: string[] }`、拡張機能ではカスタムデータ）
- `fromHook`：拡張機能によって生成された場合は `true`、pi によって生成された場合は `false`/`undefined`（レガシーのフィールド名）

### ContextEditEntry

以前のコンテキスト生成エントリのうち、1 つに対する追記専用の編集です。将来のモデルコンテキストのみを変更します。対象エントリとそのメタデータは、生の履歴、UI、エクスポート、セッションの集計では変更されません。

```json
{"type":"context_edit","id":"g6h7i8j9","parentId":"f6g7h8i9","timestamp":"2024-12-03T14:11:00.000Z","targetId":"c3d4e5f6","replacement":null}
```

対象には、ユーザー、アシスタント、ツール結果、またはカスタムメッセージのエントリを指定できます。`replacement: null` は対象をモデルコンテキストから除外します。null ではない `replacement` は、対象メッセージのコンテンツのみを置き換えます。アシスタントおよびツール結果エントリでは、これらのロールがコンテンツ配列を必要とするため、文字列による置換は 1 つのテキストブロックに正規化されます。複数の編集が同じエントリを対象とする場合、アクティブな分岐上の最新の編集が優先されます。編集は分岐に相対的です。編集前の地点へ移動すると、対象の元の内容が再び現れます。

### BranchSummaryEntry

`/tree` で分岐を切り替える際に、共通の祖先までの離脱した分岐について LLM が生成した要約とともに作成されます。離脱したパスのコンテキストを取り込みます。

```json
{"type":"branch_summary","id":"g7h8i9j0","parentId":"a1b2c3d4","timestamp":"2024-12-03T14:15:00.000Z","fromId":"f6g7h8i9","summary":"Branch explored approach A..."}
```

`parentId` は、新しい分岐が続く元となるエントリです。`fromId` は、離脱したパスが要約された以前のリーフです。

任意のフィールド：
- `usage`：要約生成時の LLM 使用量。セッションのトークン数とコストの合計に含まれます
- `details`：デフォルトではファイル追跡データ（`{ readFiles: string[], modifiedFiles: string[] }`）、拡張機能ではカスタムデータ
- `fromHook`：拡張機能によって生成された場合は `true`、pi によって生成された場合は `false`/`undefined`（レガシーのフィールド名）

### CustomEntry

拡張機能の状態を永続化します。LLM コンテキストには含まれません。

```json
{"type":"custom","id":"h8i9j0k1","parentId":"g7h8i9j0","timestamp":"2024-12-03T14:20:00.000Z","customType":"my-extension","data":{"count":42}}
```

再読み込み時に拡張機能のエントリを識別するには、`customType` を使用します。対話モードでは `pi.registerEntryRenderer(customType, renderer)` によってカスタムエントリを描画できますが、LLM コンテキストには引き続き含まれません。

Pi は、[仮想モデル](virtual-models.md) のルーター状態を、`customType` が `pi.virtual-model-state`、`data` が `{ provider, modelId, state }` であるカスタムエントリとして保存します。

### CustomMessageEntry

拡張機能から挿入され、LLM コンテキストに含まれるメッセージです。

```json
{"type":"custom_message","id":"i9j0k1l2","parentId":"h8i9j0k1","timestamp":"2024-12-03T14:25:00.000Z","customType":"my-extension","content":"Injected context...","display":true}
```

フィールド：
- `content`：文字列または `(TextContent | ImageContent)[]`（UserMessage と同じ）
- `display`：`true` = TUI に独自のスタイルで表示、`false` = 非表示
- `details`：拡張機能固有の任意のメタデータ（LLM には送信されません）

### LabelEntry

エントリに付ける、ユーザー定義のブックマーク／マーカーです。

```json
{"type":"label","id":"j0k1l2m3","parentId":"i9j0k1l2","timestamp":"2024-12-03T14:30:00.000Z","targetId":"a1b2c3d4","label":"checkpoint-1"}
```

ラベルをクリアするには、`label` を `undefined` に設定します。

### SessionInfoEntry

セッションのメタデータ（例：ユーザー定義の表示名）です。`/name`、`--name` / `-n`、または拡張機能の `pi.setSessionName()` で設定します。

```json
{"type":"session_info","id":"k1l2m3n4","parentId":"j0k1l2m3","timestamp":"2024-12-03T14:35:00.000Z","name":"Refactor auth module"}
```

セッション名を設定すると、セッションセレクター（`/resume`）では最初のメッセージの代わりにセッション名が表示されます。

## ツリー構造

通常、エントリは 1 つのツリーを形成しますが、ナビゲーション API によって複数のルートを作成できます。
- ルートエントリは `parentId: null` を持ちます。最初のエントリが当初のルートです
- ルート以外の各エントリは、`parentId` を介して親を参照します
- 分岐すると、以前のエントリから新しい子が作成されます
- 「リーフ」はツリー内の現在位置です
- `resetLeaf()` または `branchWithSummary(null, ...)` を呼び出すと、後続のエントリを別のルートにできます

```
[user msg] ─── [assistant] ─── [user msg] ─── [assistant] ─┬─ [user msg] ← current leaf
                                                            │
                                                            └─ [branch_summary] ─── [user msg] ← alternate branch
```

## コンテキストの構築

`buildContextEntries()` は現在のリーフからルートまでをたどり、圧縮を考慮しながらアクティブなエントリのリストを生成します。

1. パス上のすべてのエントリを収集します
2. パス上に 1 つ以上の `CompactionEntry` がある場合、最新のものを使用します。
   - 最初に圧縮エントリを含めます
   - `firstKeptEntryId` から圧縮エントリの直前までの、システム以外のエントリを含めます
   - 圧縮エントリより後のエントリを含めます
3. 対話モードで描画できるよう、選択範囲内のメッセージ以外のエントリを保持します

続いて `buildSessionProjection()` は、選択された各対象に最新の `context_edit` を適用します。モデルから見えるメッセージを、そのソースエントリとともに返します。除外された対象からはメッセージが生成されません。置換では、コンテンツのみを変更し、ソースエントリのロールとメタデータを保持します。選択された生のエントリは変更されません。

`buildSessionContext()` はそのプロジェクションを基に、LLM 用のメッセージリストを生成します。

1. パス全体から現在のモデルと思考レベルの設定を抽出します
2. 選択されたエントリをメッセージに変換します。
   - `message` -> 保存された `AgentMessage`
   - `compaction` -> 完全なシステムチェックポイント、その後に `compactionSummary`
   - `branch_summary` -> `branchSummary`
   - `custom_message` -> `CustomMessage`
   - `context_edit` -> それ自体のコンテキストメッセージなし
   - `usage` と `custom` -> コンテキストメッセージなし

圧縮の要約は、`firstKeptEntryId` より前のエントリを置き換えます。圧縮前のシステムメッセージは保持範囲から再生されず、完全なチェックポイントに統合されます。保持されたシステム以外のエントリと、圧縮後のすべてのエントリは、引き続き LLM から利用できます。

## 解析例

```typescript
import { readFileSync } from "fs";

const lines = readFileSync("session.jsonl", "utf8").trim().split("\n");

for (const line of lines) {
  const entry = JSON.parse(line);

  switch (entry.type) {
    case "session":
      console.log(`Session v${entry.version ?? 1}: ${entry.id}`);
      break;
    case "message":
      console.log(`[${entry.id}] ${entry.message.role}: ${JSON.stringify(entry.message.content)}`);
      break;
    case "compaction":
      console.log(`[${entry.id}] Compaction: ${entry.tokensBefore} tokens summarized`);
      break;
    case "branch_summary":
      console.log(`[${entry.id}] Branch from ${entry.fromId}`);
      break;
    case "usage":
      console.log(`[${entry.id}] Usage (${entry.kind}): ${entry.usage.totalTokens} tokens`);
      break;
    case "custom":
      console.log(`[${entry.id}] Custom (${entry.customType}): ${JSON.stringify(entry.data)}`);
      break;
    case "custom_message":
      console.log(`[${entry.id}] Extension message (${entry.customType}): ${entry.content}`);
      break;
    case "label":
      console.log(`[${entry.id}] Label "${entry.label}" on ${entry.targetId}`);
      break;
    case "model_change":
      console.log(`[${entry.id}] Model: ${entry.provider}/${entry.modelId}`);
      break;
    case "thinking_level_change":
      console.log(`[${entry.id}] Thinking: ${entry.thinkingLevel}`);
      break;
  }
}
```
