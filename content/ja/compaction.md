# 圧縮リファレンス

このリファレンスでは、自動圧縮、分岐の要約、永続化されたエントリ、および拡張機能のフックについて説明します。ユーザーワークフローについては、[セッションとコンテキスト](sessions.md#manage-conversation-context)を参照してください。

**ソースファイル**（[pi](https://github.com/earendil-works/pi)）：
- [`packages/coding-agent/src/core/compaction/compaction.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) - 自動圧縮のロジック
- [`packages/coding-agent/src/core/compaction/branch-summarization.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) - 分岐の要約
- [`packages/coding-agent/src/core/compaction/utils.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) - 共有ユーティリティ（ファイル追跡、シリアライズ）
- [`packages/coding-agent/src/core/session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) - エントリ型（`CompactionEntry`、`BranchSummaryEntry`）
- [`packages/coding-agent/src/core/extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) - 拡張機能イベント型

プロジェクト内の TypeScript 定義については、`node_modules/@earendil-works/pi-coding-agent/dist/`を確認してください。

## 概要

Pi には、次の2つの要約メカニズムがあります。

| メカニズム | トリガー | 目的 |
|-----------|---------|---------|
| 圧縮 | コンテキストがしきい値を超えた場合、または `/compact` | 古いメッセージを要約してコンテキストを空ける |
| 分岐の要約 | `/tree` による移動 | 分岐を切り替える際にコンテキストを保持する |

どちらも密接に関連する構造化形式を使用し、ファイル操作を累積的に追跡します。こうした一度限りのプロンプトは再利用される可能性が低いため、要約リクエストではプロンプトキャッシュへの書き込みが無効になります。

## 圧縮

### トリガーされるタイミング

自動圧縮は、次の場合にトリガーされます。

```
contextTokens > contextWindow - reserveTokens
```

デフォルトでは、`reserveTokens` は16384トークンです（`~/.pi/agent/settings.json` または `<project-dir>/.pi/settings.json` で設定可能）。これにより、LLM の応答用の余地が確保されます。

複数ターンにわたるエージェントの実行中、Pi はツールの実行が完了してその結果が追加された後、次のアシスタント応答を開始する前に、正規の投影コンテキストを確認します。しきい値を超えた場合、Pi は `prepareNextTurn` 中に圧縮を行い、その後、`turn_start` の前に既存のキャッチアップ用ステアリングポーリングを実行します。完了したツールバッチによって実行が終了し、別の応答を必要とするキュー内のメッセージがない場合、Pi はこのターン間チェックを省略します。また、Pi は新しいユーザープロンプトの前にも確認を行い、低レベルの実行が終了した後に最終試行としてオーバーフローからの復旧を行います。

プロバイダーのコンテキストオーバーフローエラーまたは早期の最終 `stopReason: "length"` によって、圧縮して再試行する復旧処理を1回選択できます。ツール呼び出しを伴う長さ上限による応答では、合成された失敗ツール結果が保持され、実行を強制終了するのではなく、通常のツール／キュースケジューラーに従います。

`/compact [instructions]` を使って手動でトリガーすることもでき、その場合はオプションの指示によって要約の焦点を指定できます。

### 仕組み

1. **切断点を見つける**：確定済みのセッション投影を後方にたどり、`keepRecentTokens`（デフォルトは20k。`~/.pi/agent/settings.json` または `<project-dir>/.pi/settings.json` で設定可能）に達するまで推定トークン数を累積します
2. **メッセージを抽出する**：直前の保持境界（またはセッション開始時点）から切断点までの投影済みメッセージを収集します
3. **要約を生成する**：構造化形式で要約するよう LLM を呼び出し、以前の要約がある場合は反復処理用のコンテキストとして渡します
4. **エントリを追加する**：要約と `firstKeptEntryId` を含む `CompactionEntry` を保存します
5. **コンテキストを再構築する**：セッションは、要約と `firstKeptEntryId` 以降のメッセージを使用して、次のリクエスト用のコンテキストを再構築します

```
Before compaction:

  entry:  0     1     2     3      4     5     6      7      8     9
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┘
                └────────┬───────┘ └──────────────┬──────────────┘
               messagesToSummarize            kept messages
                                   ↑
                          firstKeptEntryId (entry 4)

After compaction (new entry appended):

  entry:  0     1     2     3      4     5     6      7      8     9     10
        ┌─────┬─────┬─────┬──────┬─────┬─────┬──────┬──────┬─────┬─────┬─────┐
        │ hdr │ usr │ ass │ tool │ usr │ ass │ tool │ tool │ ass │ tool│ cmp │
        └─────┴─────┴─────┴──────┴─────┴─────┴──────┴──────┴─────┴─────┴─────┘
               └──────────┬──────┘ └──────────────────────┬───────────────────┘
                 not sent to LLM                    sent to LLM
                                                         ↑
                                              starts from firstKeptEntryId

What the LLM sees:

  ┌────────┬─────────┬─────┬─────┬──────┬──────┬─────┬──────┐
  │ system │ summary │ usr │ ass │ tool │ tool │ ass │ tool │
  └────────┴─────────┴─────┴─────┴──────┴──────┴─────┴──────┘
       ↑         ↑      └─────────────────┬────────────────┘
    prompt   from cmp          messages from firstKeptEntryId
```

圧縮を繰り返す場合、要約対象の範囲は圧縮エントリ自体ではなく、前回の圧縮の保持境界（`firstKeptEntryId`）から始まります。その保持エントリがパス内に見つからない場合は、前回の圧縮の次のエントリにフォールバックします。何も保持しない圧縮では、自身の ID を `firstKeptEntryId` として記録します。繰り返し圧縮する場合は、そのエントリの後から開始します。これにより、以前の圧縮で残ったメッセージも次の要約処理に含められ、保持されます。また Pi は、新しい `CompactionEntry` を書き込む前に、再構築され、コンテキスト編集が適用されたセッション投影から `tokensBefore` を再計算します。そのため、トークン数には置換対象となる実際の圧縮前コンテキストが反映されます。省略された生のエントリは引き続き保存されますが、切断点の選択、要約、チェックポイント、またはトークン推定には影響しません。

### オーバーフローと長さ上限からの復旧順序

復旧では、既存のライフサイクルとキューの順序が維持されます。完了した試行は `turn_end` と `agent_end` から引き続き参照できます。実行後の復旧では、新たに再試行する前に、永続化されたモデルコンテキストを修復します。

```text
persist final assistant response
→ extension/public turn_end
→ extension/public agent_end
→ append context_edit omissions for the selected attempt
→ for overflow/length: run session_before_compact and append compaction on success
→ start the retry as a fresh run
```

復旧用の圧縮が失敗またはキャンセルされた場合、Pi は省略の編集を保持し、圧縮を追加せず、内部再試行もスケジュールしません。キュー内にある既存の処理には、通常のステアリングとフォローアップのルールが引き続き適用されます。`agent_before_settle` は、復旧処理後に修復された投影を参照します。生のトランスクリプト履歴、エクスポート、請求合計、および履歴検索拡張機能からは、省略された試行を引き続き確認できます。

### 分割されたユーザーメッセージ範囲

ユーザーメッセージ範囲はユーザーメッセージで始まり、次のユーザーメッセージまでのすべてのターンを含みます。通常、圧縮はユーザーメッセージの境界で切断されます。

1つのユーザーメッセージ範囲が `keepRecentTokens` を超える場合、切断点はその範囲内のアシスタントメッセージに設定されます。これが、分割されたユーザーメッセージ範囲です。

```
Split user-message span (one span exceeds budget):

  entry:  0     1     2      3     4      5      6     7      8
        ┌─────┬─────┬─────┬──────┬─────┬──────┬──────┬─────┬──────┐
        │ hdr │ usr │ ass │ tool │ ass │ tool │ tool │ ass │ tool │
        └─────┴─────┴─────┴──────┴─────┴──────┴──────┴─────┴──────┘
                ↑                                     ↑
         turnStartIndex = 1                  firstKeptEntryId = 7
                │                                     │
                └──── turnPrefixMessages (1-6) ───────┘
                                                      └── kept (7-8)

  isSplitTurn = true
  messagesToSummarize = []  (no earlier user-message spans)
  turnPrefixMessages = [usr, ass, tool, ass, tool, tool]
```

分割されたユーザーメッセージ範囲では、Pi は次の2つの要約を生成して結合します。
1. **履歴の要約**：以前のコンテキスト（存在する場合）
2. **ユーザーメッセージ範囲の前半部分の要約**：分割されたユーザーメッセージ範囲の前半部分

### 切断点のルール

有効な切断点は次のとおりです。
- ユーザーメッセージ
- アシスタントメッセージ
- BashExecution メッセージ
- カスタムメッセージ（custom_message、branch_summary）

ツール結果の位置では決して切断しません（ツール結果は対応するツール呼び出しと一緒に保持する必要があります）。

準備処理で保持境界をコンテキストから不可視の接尾部分へ進めるのは、その接尾部分に省略されたアシスタントの試行が含まれ、かつ省略されていないコンテキスト生成エントリが含まれない場合だけです。復旧時の `context_edit` による省略は、このルールを満たします。本質的にコンテキストから不可視のメタデータが共存していてもかまいません。メタデータだけの場合や、新たに追加されたカスタムメッセージがある場合、切断点は移動しません。候補となる入力または要約対象の前半部分に影響する置換編集がある場合も、境界の前進は阻止されます。これは、省略されたアシスタントが編集前の入力に応答したためです。最終的に省略される接尾エントリの置換は安全なままです。これにより、放棄された試行を省略したままにする編集を保持しつつ、予算超過となった復旧済み入力を要約できます。また、管理情報の変更によって、新しいモデル入力がそのまま保持されるかどうかが左右されることもありません。

### CompactionEntry の構造

[`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) で定義されています。

```typescript
interface CompactionEntry<T = unknown> {
  type: "compaction";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  firstKeptEntryId: string;
  tokensBefore: number;
  usage?: Usage;       // LLM usage that generated the summary
  fromHook?: boolean;  // true if provided by extension (legacy field name)
  details?: T;         // implementation-specific data
}

// Default compaction uses this for details (from compaction.ts):
interface CompactionDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

拡張機能は、JSON でシリアライズ可能な任意のデータを `details` に保存できます。デフォルトの圧縮ではファイル操作を追跡しますが、カスタム拡張機能の実装では独自の構造を使用できます。生成された要約と拡張機能が提供する要約には、利用可能な場合、その LLM の `usage` が保存されるため、セッション合計に要約処理が含まれます。

実装については、[`prepareCompaction()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) と [`compact()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/compaction.ts) を参照してください。プログラムから直接要約する場合、`generateSummary()` は要約テキストを返し、`generateSummaryWithUsage()` は `{ text, usage }` を返します。

## 分岐の要約

### トリガーされるタイミング

`/tree` を使用して別の分岐へ移動すると、Pi は離れる側の作業を要約するかどうかを確認します。これにより、元の分岐のコンテキストが新しい分岐に挿入されます。

### 仕組み

1. **共通の祖先を見つける**：移動前と移動後の位置で共有される最も深いノードを見つけます
2. **エントリを収集する**：移動前の葉から共通の祖先までさかのぼります
3. **予算に合わせて準備する**：トークン予算内に収まるメッセージを新しいものから順に含めます
4. **要約を生成する**：構造化形式で LLM を呼び出します
5. **エントリを追加する**：移動先に `BranchSummaryEntry` を保存します

```
Tree before navigation:

         ┌─ B ─ C ─ D (old leaf, being abandoned)
    A ───┤
         └─ E ─ F (target)

Common ancestor: A
Entries to summarize: B, C, D

After navigation with summary:

         ┌─ B ─ C ─ D
    A ───┤
         └─ E ─ F ─ [summary of B,C,D] (new leaf)
```

### 累積的なファイル追跡

デフォルトの圧縮と分岐の要約では、ファイルを累積的に追跡します。どちらも、要約対象のメッセージ内にあるツール呼び出しからファイル操作を抽出します。圧縮では、以前に Pi が生成した圧縮のファイル一覧も引き継ぎます。分岐の要約では、要約対象のエントリ内にある Pi 生成の分岐の要約からファイル一覧を引き継ぎます。

したがって、ファイル追跡はデフォルトの圧縮やネストされたデフォルトの分岐の要約を通じて累積されます。`fromHook` フィールドが `true` である、拡張機能によって生成された要約からは、Pi はファイル一覧を自動的に引き継ぎません。拡張機能は独自の `details` 形式を管理します。

### BranchSummaryEntry の構造

[`session-manager.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/session-manager.ts) で定義されています。

```typescript
interface BranchSummaryEntry<T = unknown> {
  type: "branch_summary";
  id: string;
  parentId: string | null;
  timestamp: string;
  summary: string;
  fromId: string;      // Entry we navigated from
  usage?: Usage;       // LLM usage that generated the summary
  fromHook?: boolean;  // true if provided by extension (legacy field name)
  details?: T;         // implementation-specific data
}

// Default branch summarization uses this for details (from branch-summarization.ts):
interface BranchSummaryDetails {
  readFiles: string[];
  modifiedFiles: string[];
}
```

圧縮と同様に、拡張機能はカスタムデータを `details` に保存できます。

実装については、[`collectEntriesForBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、[`prepareBranchEntries()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts)、および [`generateBranchSummary()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/branch-summarization.ts) を参照してください。

## 要約形式

どちらの形式にも、目標、制約と希望、進捗、主な決定事項、次のステップが含まれます。圧縮の要約には、重要なコンテキストも含まれます。分岐の要約は、次のステップで終了します。Pi は、関連する場合、どちらの形式にもファイル一覧を追加します。

圧縮の要約では、次の形式を使用します。

```markdown
## Goal
[What the user is trying to accomplish]

## Constraints & Preferences
- [Requirements mentioned by user]

## Progress
### Done
- [x] [Completed tasks]

### In Progress
- [ ] [Current work]

### Blocked
- [Issues, if any]

## Key Decisions
- **[Decision]**: [Rationale]

## Next Steps
1. [What should happen next]

## Critical Context
- [Data needed to continue]

<read-files>
path/to/file1.ts
path/to/file2.ts
</read-files>

<modified-files>
path/to/changed.ts
</modified-files>
```

### メッセージのシリアライズ

要約する前に、[`serializeConversation()`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/compaction/utils.ts) を介してメッセージをテキストにシリアライズします。

```
[User]: What they said
[Assistant thinking]: Internal reasoning
[Assistant]: Response text
[Assistant tool calls]: read(path="foo.ts"); edit(path="bar.ts", ...)
[Tool result]: Output from tool
```

これにより、モデルがそれを継続すべき会話として扱うことを防ぎます。

シリアライズ時に、ツール結果は2000文字に切り詰められます。その上限を超えた内容は、切り詰められた文字数を示すマーカーに置き換えられます。ツール結果（特に `read` と `bash`）は通常、コンテキストサイズへの影響が最も大きいため、これによって要約リクエストを妥当なトークン予算内に収めます。

## 拡張機能による要約のカスタマイズ

拡張機能は、圧縮と分岐の要約の両方に介入してカスタマイズできます。イベント型の定義については、[`extensions/types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/core/extensions/types.ts) を参照してください。

### session_before_compact

自動圧縮または `/compact` の前に発火します。キャンセルするか、カスタム要約を提供できます。型ファイル内の `SessionBeforeCompactEvent` と `CompactionPreparation` を参照してください。

```typescript
pi.on("session_before_compact", async (event, ctx) => {
  const { preparation, branchEntries, customInstructions, reason, willRetry, signal } = event;

  // preparation.messagesToSummarize - messages to summarize
  // preparation.turnPrefixMessages - user-message-span prefix (if isSplitTurn)
  // preparation.previousSummary - previous compaction summary
  // preparation.fileOps - extracted file operations
  // preparation.tokensBefore - context tokens before compaction
  // preparation.firstKeptEntryId - where kept messages start
  // preparation.settings - effective settings after applying model overrides

  // branchEntries - all entries on current branch (for custom state)
  // reason - "manual" (/compact), "threshold", or "overflow"
  // willRetry - whether the aborted turn is retried after compaction (overflow recovery)
  // signal - AbortSignal (pass to LLM calls)

  // Cancel:
  return { cancel: true };

  // Custom summary:
  return {
    compaction: {
      summary: "Your summary...",
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      // usage: summaryResponse.usage, // Optional; included in session totals
      details: { /* custom data */ },
    }
  };
});
```

#### メッセージをテキストに変換する

独自のモデルで要約を生成するには、`serializeConversation` を使用してメッセージをテキストに変換します。

```typescript
import { convertToLlm, serializeConversation } from "@earendil-works/pi-coding-agent";

pi.on("session_before_compact", async (event, ctx) => {
  const { preparation } = event;
  
  // Convert AgentMessage[] to Message[], then serialize to text
  const conversationText = serializeConversation(
    convertToLlm(preparation.messagesToSummarize)
  );
  // Returns:
  // [User]: message text
  // [Assistant thinking]: thinking content
  // [Assistant]: response text
  // [Assistant tool calls]: read(path="..."); bash(command="...")
  // [Tool result]: output text

  // Now send to your model for summarization
  const { summary, usage } = await myModel.summarize(conversationText);
  
  return {
    compaction: {
      summary,
      firstKeptEntryId: preparation.firstKeptEntryId,
      tokensBefore: preparation.tokensBefore,
      usage,
    }
  };
});
```

別のモデルを使用する完全な例については、[custom-compaction.ts](../examples/extensions/custom-compaction.ts) を参照してください。

### session_compact_failed

手動または自動の圧縮が失敗するか中止されたときに発火します。`session_before_compact` の試行と最終結果を対応付ける必要があるテレメトリ拡張機能に役立ちます。

```typescript
pi.on("session_compact_failed", async (event, ctx) => {
  const { reason, errorMessage, aborted, willRetry, fromExtension } = event;
  // reason - "manual" (/compact), "threshold", or "overflow"
  // errorMessage - present for non-abort failures
  // aborted - true for canceled/aborted compactions
  // willRetry - whether the aborted turn would have retried after compaction
  // fromExtension - whether extension-provided compaction content was being used
});
```

### session_before_tree

`/tree` による移動の前に発火します。ユーザーが要約を選択したかどうかにかかわらず、常に発火します。移動をキャンセルするか、カスタム要約を提供できます。

```typescript
pi.on("session_before_tree", async (event, ctx) => {
  const { preparation, signal } = event;

  // preparation.targetId - where we're navigating to
  // preparation.oldLeafId - current position (being abandoned)
  // preparation.commonAncestorId - shared ancestor
  // preparation.entriesToSummarize - entries that would be summarized
  // preparation.userWantsSummary - whether user chose to summarize

  // Cancel navigation entirely:
  return { cancel: true };

  // Provide custom summary (only used if userWantsSummary is true):
  if (preparation.userWantsSummary) {
    return {
      summary: {
        summary: "Your summary...",
        // usage: summaryResponse.usage, // Optional; included in session totals
        details: { /* custom data */ },
      }
    };
  }
});
```

型ファイル内の `SessionBeforeTreeEvent` と `TreePreparation` を参照してください。

## 設定

`~/.pi/agent/settings.json` または `<project-dir>/.pi/settings.json` で圧縮を設定します。

```json
{
  "compaction": {
    "enabled": true,
    "reserveTokens": 16384,
    "keepRecentTokens": 20000
  }
}
```

| 設定 | デフォルト | 説明 |
|---------|---------|-------------|
| `enabled` | `true` | 自動圧縮を有効にします |
| `reserveTokens` | `16384` | LLMの応答用に予約するトークン数 |
| `keepRecentTokens` | `20000` | 保持する直近のトークン数（要約されません） |

`"enabled": false`で自動圧縮を無効にします。`/compact`を使用すれば、引き続き手動で圧縮できます。

### モデルごとのオーバーライド

`compaction.modelOverrides`を使用して、モデルごとにトークン予算を調整します。

```json
{
  "compaction": {
    "reserveTokens": 16384,
    "keepRecentTokens": 20000,
    "modelOverrides": {
      "some-provider/big-model": {
        "reserveTokens": 400000
      }
    }
  }
}
```

コンテキストウィンドウが1Mのモデルでは、このオーバーライドにより、トークン数が600Kを超えると圧縮がトリガーされ、通常どおり直近の20000トークンが保持されます。他のモデルでは、通常の16384トークンの予約が維持されます。`reserveTokens`は要約出力の上限にも影響し、その上限はモデルの最大出力トークン数に制限されます。単なるトリガーのしきい値ではありません。

キーは、モデルID内のスラッシュも含め、大文字と小文字が区別される完全一致の`provider/modelId`値です。`reserveTokens`と`keepRecentTokens`の各値は、それぞれ独立して、モデルのオーバーライド、通常設定、組み込みのデフォルトの順にフォールバックします。値は非負の安全な整数でなければなりません。一致するモデルのオーバーライドに無効な値がある場合、読み取り時にエラーが発生します。通常設定へフォールバックするのは、省略されたフィールドだけです。モデルのオーバーライドの各エントリはオブジェクトでなければなりません。通常のトークン設定に無効な値がある場合、アクティブなモデルに有効なオーバーライドがあっても、読み取り時にエラーが発生します。組み込みのデフォルトが使用されるのは、省略された通常値だけです。`enabled`はモデル固有ではなく、引き続きグローバルです。

解決されたこれらの値は、手動圧縮、すべての自動しきい値チェック、オーバーフローからの復旧、および拡張機能から参照できる`preparation.settings`に使用されます。モデルを切り替えると、通常設定を変更することなく、その後のチェックと圧縮に反映されます。すでに進行中の圧縮では、その処理用に取得されたモデルと設定が使用されます。分岐の要約設定には影響しません。

オーバーライドは、グローバル設定とプロジェクト設定の両方で機能します。検索前にファイルが再帰的にマージされるため、グローバルのモデル固有値がプロジェクト全体のフォールバックより優先されます。これを変更するには、プロジェクト側でそのモデルのエントリをオーバーライドする必要があります。詳細については、[設定](settings.md#per-model-compaction-overrides)を参照してください。
