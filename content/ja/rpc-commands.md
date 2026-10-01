# RPC コマンド

このリファレンスでは、[RPC モード](rpc.md)で標準入力から受け付けるコマンドを一覧にしています。各コマンドとレスポンスは、それぞれ 1 つの JSON オブジェクトです。共通のメッセージ値には[メッセージ型](message-types.md)を使用します。

## プロンプトの送信

### prompt

ユーザープロンプトをエージェントに送信します。コマンドのレスポンスは、プロンプトが受理、キューへの追加、または処理された後に返されます。受理後もイベントは非同期でストリーミングされ続けます。

```json
{"id": "req-1", "type": "prompt", "message": "Hello, world!"}
```

画像を含む場合：
```json
{"type": "prompt", "message": "What's in this image?", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

**ストリーミング中**：エージェントがすでにストリーミング中の場合、メッセージをキューに追加するには `streamingBehavior` を指定する必要があります：

```json
{"type": "prompt", "message": "New instruction", "streamingBehavior": "steer"}
```

- `"steer"`：エージェントの実行中にメッセージをキューに追加します。現在のアシスタントターンがツール呼び出しの実行を完了した後、次の LLM 呼び出しの前に配信されます。
- `"followUp"`：エージェントが完了するまで待機します。メッセージはエージェントが停止したときにのみ配信されます。

エージェントがストリーミング中で `streamingBehavior` が指定されていない場合、コマンドはエラーを返します。

**拡張機能コマンド**：メッセージが拡張機能コマンド（例：`/mycommand`）の場合、ストリーミング中でも即座に実行されます。拡張機能コマンドは、`pi.sendMessage()` を介して独自の LLM 操作を管理します。

**入力の展開**：スキルコマンド（`/skill:name`）とプロンプトテンプレート（`/template`）は、送信またはキューへの追加前に展開されます。

レスポンス：
```json
{"id": "req-1", "type": "response", "command": "prompt", "success": true, "data": {"disposition": "started"}}
```

`data.disposition` は、拡張機能コマンドまたは入力ハンドラーがプロンプトを処理した場合は `"handled"`、Pi が実行中にキューへ追加した場合は `"queued"`、Pi が実行開始のために受理した場合は `"started"` です。これは送信されたプロンプトについて示すものであり、拡張機能によって開始された独立した処理や完了の保証について示すものではありません。

`success: true` は、プロンプトが受理、キューへの追加、または即時処理されたことを意味します。`success: false` は、プロンプトが受理前に拒否されたことを意味します。受理後の失敗は、同じリクエスト ID に対する 2 回目の `response` としてではなく、通常のイベントおよびメッセージストリームを通じて報告されます。

`images` フィールドは省略可能です。各画像は `ImageContent` 形式を使用します：`{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}`。

### steer

エージェントの実行中にステアリングメッセージをキューへ追加します。現在のアシスタントターンがツール呼び出しの実行を完了した後、次の LLM 呼び出しの前に配信されます。スキルコマンドとプロンプトテンプレートは展開されます。拡張機能コマンドは使用できません（代わりに `prompt` を使用してください）。

```json
{"type": "steer", "message": "Stop and do this instead"}
```

画像を含む場合：
```json
{"type": "steer", "message": "Look at this instead", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` フィールドは省略可能です。各画像は `ImageContent` 形式（`prompt` と同じ）を使用します。

レスポンス：
```json
{"type": "response", "command": "steer", "success": true, "data": {"disposition": "queued"}}
```

`data.disposition` は、入力ハンドラーがこのステアリングを処理した場合は `"handled"`、Pi がキューへ追加した場合（ハンドラーによる変換後を含む）は `"queued"` です。このメッセージがキューに残ることを保証するものではありません。

ステアリングメッセージの処理方法を制御するには、[set_steering_mode](#set_steering_mode) を参照してください。

### follow_up

エージェントの完了後に処理するフォローアップメッセージをキューへ追加します。エージェントにツール呼び出しもステアリングメッセージも残っていない場合にのみ配信されます。スキルコマンドとプロンプトテンプレートは展開されます。拡張機能コマンドは使用できません（代わりに `prompt` を使用してください）。

```json
{"type": "follow_up", "message": "After you're done, also do this"}
```

画像を含む場合：
```json
{"type": "follow_up", "message": "Also check this image", "images": [{"type": "image", "data": "base64-encoded-data", "mimeType": "image/png"}]}
```

`images` フィールドは省略可能です。各画像は `ImageContent` 形式（`prompt` と同じ）を使用します。

レスポンス：
```json
{"type": "response", "command": "follow_up", "success": true, "data": {"disposition": "queued"}}
```

`data.disposition` の `"handled"` または `"queued"` の意味は `steer` と同じで、このフォローアップに適用されます。

フォローアップメッセージの処理方法を制御するには、[set_follow_up_mode](#set_follow_up_mode) を参照してください。

### abort

現在の操作を中止し、セッションがアイドル状態になるまで待ってから応答します。

```json
{"type": "abort"}
```

レスポンス：
```json
{"type": "response", "command": "abort", "success": true}
```

### clear_queue

キューにあるステアリングメッセージとフォローアップメッセージを削除し、そのテキストを返します。

```json
{"type": "clear_queue"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "clear_queue",
  "success": true,
  "data": {
    "steering": ["Change direction"],
    "followUp": ["Summarize when finished"]
  }
}
```

対話的な Esc の動作を実装するには、`abort` の前に `clear_queue` を送信し、返されたテキストをクライアントのエディターに復元します。メッセージがセッションのキューに残っている場合、`abort` はその処理を続行します。

### new_session

新しいセッションを開始します。`session_before_switch` 拡張機能イベントハンドラーによってキャンセルできます。

```json
{"type": "new_session"}
```

任意の親セッション追跡を使用する場合：
```json
{"type": "new_session", "parentSession": "/path/to/parent-session.jsonl"}
```

レスポンス：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": false}}
```

拡張機能によってキャンセルされた場合：
```json
{"type": "response", "command": "new_session", "success": true, "data": {"cancelled": true}}
```

## 状態

### get_state

現在のセッション状態を取得します。

```json
{"type": "get_state"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_state",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isStreaming": false,
    "isCompacting": false,
    "steeringMode": "all",
    "followUpMode": "one-at-a-time",
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "sessionName": "my-feature-work",
    "autoCompactionEnabled": true,
    "messageCount": 5,
    "pendingMessageCount": 0
  }
}
```

`model` フィールドは完全な [Model](#model-object) オブジェクトです。モデルが選択されていない場合は省略されます。`sessionName` フィールドは `set_session_name` で設定された表示名です。未設定の場合は省略されます。

### get_messages

会話内のすべてのメッセージを取得します。

```json
{"type": "get_messages"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_messages",
  "success": true,
  "data": {"messages": [...]}
}
```

メッセージは `AgentMessage` オブジェクトです（[メッセージ型](message-types.md)を参照）。

## モデル

### set_model

指定したモデルに切り替えます。

```json
{"type": "set_model", "provider": "anthropic", "modelId": "claude-sonnet-4-20250514"}
```

レスポンスには完全な [Model](#model-object) オブジェクトが含まれます：
```json
{
  "type": "response",
  "command": "set_model",
  "success": true,
  "data": {...}
}
```

### cycle_model

次に利用可能なモデルへ切り替えます。利用可能なモデルが 1 つだけの場合は `null` データを返します。

```json
{"type": "cycle_model"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "cycle_model",
  "success": true,
  "data": {
    "model": {...},
    "thinkingLevel": "medium",
    "isScoped": false
  }
}
```

`model` フィールドは完全な [Model](#model-object) オブジェクトです。

### get_available_models

設定済みのすべてのモデルを一覧表示します。

```json
{"type": "get_available_models"}
```

レスポンスには、完全な [Model](#model-object) オブジェクトの配列が含まれます：
```json
{
  "type": "response",
  "command": "get_available_models",
  "success": true,
  "data": {
    "models": [...]
  }
}
```

## 思考

### set_thinking_level

対応しているモデルの推論／思考レベルを設定します。

```json
{"type": "set_thinking_level", "level": "high"}
```

レベル：`"off"`、`"minimal"`、`"low"`、`"medium"`、`"high"`、`"xhigh"`、`"max"`

`"xhigh"` と `"max"` は、選択したモデルが対応している場合にのみ公開されます。GPT-5.6 を含む一部のモデルでは、両方が公開されます。

レスポンス：
```json
{"type": "response", "command": "set_thinking_level", "success": true}
```

### cycle_thinking_level

利用可能な思考レベルを順に切り替えます。モデルが思考に対応していない場合は `null` データを返します。

```json
{"type": "cycle_thinking_level"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "cycle_thinking_level",
  "success": true,
  "data": {"level": "high"}
}
```

### get_available_thinking_levels

現在のモデルが対応する思考レベルを一覧表示します。推論に対応していないモデルでは `["off"]` を返します。

```json
{"type": "get_available_thinking_levels"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_available_thinking_levels",
  "success": true,
  "data": {
    "levels": ["off", "minimal", "low", "medium", "high"]
  }
}
```

## キューモード

### set_steering_mode

（`steer` からの）ステアリングメッセージの配信方法を制御します。

```json
{"type": "set_steering_mode", "mode": "one-at-a-time"}
```

モード：
- `"all"`：現在のアシスタントターンがツール呼び出しの実行を完了した後、すべてのステアリングメッセージを配信します
- `"one-at-a-time"`：完了したアシスタントターンごとにステアリングメッセージを 1 件配信します（デフォルト）

レスポンス：
```json
{"type": "response", "command": "set_steering_mode", "success": true}
```

### set_follow_up_mode

（`follow_up` からの）フォローアップメッセージの配信方法を制御します。

```json
{"type": "set_follow_up_mode", "mode": "one-at-a-time"}
```

モード：
- `"all"`：エージェントの完了時にすべてのフォローアップメッセージを配信します
- `"one-at-a-time"`：エージェントが完了するたびにフォローアップメッセージを 1 件配信します（デフォルト）

レスポンス：
```json
{"type": "response", "command": "set_follow_up_mode", "success": true}
```

## 圧縮

### compact

会話コンテキストを手動で圧縮し、トークン使用量を削減します。

```json
{"type": "compact"}
```

カスタム指示を使用する場合：
```json
{"type": "compact", "customInstructions": "Focus on code changes"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "compact",
  "success": true,
  "data": {
    "summary": "Summary of conversation...",
    "firstKeptEntryId": "abc123",
    "tokensBefore": 150000,
    "estimatedTokensAfter": 32000,
    "usage": {
      "input": 32000,
      "output": 1200,
      "cacheRead": 0,
      "cacheWrite": 0,
      "totalTokens": 33200,
      "cost": {"input": 0.01, "output": 0.02, "cacheRead": 0, "cacheWrite": 0, "total": 0.03}
    },
    "details": {}
  }
}
```

`estimatedTokensAfter` は、圧縮直後に再構築されたメッセージコンテキストに対するヒューリスティックな推定値であり、プロバイダーによる正確なトークン数ではありません。`usage` は要約を生成した LLM 呼び出しを示します。カスタム圧縮ハンドラーでは省略される場合があります。

### set_auto_compaction

コンテキストがほぼいっぱいになったときの自動圧縮を有効または無効にします。

```json
{"type": "set_auto_compaction", "enabled": true}
```

レスポンス：
```json
{"type": "response", "command": "set_auto_compaction", "success": true}
```

## 再試行

### set_auto_retry

一時的なエラー（過負荷、レート制限、5xx）発生時の自動再試行を有効または無効にします。

```json
{"type": "set_auto_retry", "enabled": true}
```

レスポンス：
```json
{"type": "response", "command": "set_auto_retry", "success": true}
```

### abort_retry

進行中の再試行を中止します（待機をキャンセルし、再試行を停止します）。

```json
{"type": "abort_retry"}
```

レスポンス：
```json
{"type": "response", "command": "abort_retry", "success": true}
```

## Bash

### bash

シェルコマンドを実行し、出力を会話コンテキストに追加します。コマンドの実行中、出力は `bash_execution_update` イベントとしてストリーミングされます。レスポンスには最終結果が含まれます。

```json
{"id": "req-1", "type": "bash", "command": "ls -la"}
```

コマンド出力をセッションに保存する一方、次のプロンプトでモデルコンテキストから除外する場合は、`excludeFromContext` を `true` に設定します。

ストリーミングされる `bash_execution_update` イベントをこのコマンドに関連付けるには、`id` を含めます。

レスポンス：
```json
{
  "id": "req-1",
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "total 48\ndrwxr-xr-x ...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": false
  }
}
```

出力が切り詰められた場合は、`fullOutputPath` が含まれます：
```json
{
  "type": "response",
  "command": "bash",
  "success": true,
  "data": {
    "output": "truncated output...",
    "exitCode": 0,
    "cancelled": false,
    "truncated": true,
    "fullOutputPath": "/tmp/pi-bash-abc123.log"
  }
}
```

**bash の結果が LLM に渡る仕組み：**

`bash` コマンドは即座に実行され、`BashResult` を返します。内部では `BashExecutionMessage` が作成され、エージェントのメッセージ状態に保存されます。

次の `prompt` コマンドが送信されると、Pi はモデルへ送信する前にコンテキストメッセージを変換します。`excludeFromContext` が true でない限り、`BashExecutionMessage` は次の形式の `UserMessage` になります：

````
Ran `ls -la`
```
total 48
drwxr-xr-x ...
```
````

これは次を意味します：
1. 含められた bash 出力は即座にではなく、**次のプロンプト**でモデルに渡されます。
2. プロンプトの送信前に複数の bash コマンドを実行できます。Pi は、`excludeFromContext` が設定されていない各出力を含めます。

### abort_bash

実行中の bash コマンドを中止します。

```json
{"type": "abort_bash"}
```

レスポンス：
```json
{"type": "response", "command": "abort_bash", "success": true}
```

## セッション

### get_session_stats

トークン使用量、コスト統計、および現在のコンテキストウィンドウ使用量を取得します。

```json
{"type": "get_session_stats"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_session_stats",
  "success": true,
  "data": {
    "sessionFile": "/path/to/session.jsonl",
    "sessionId": "abc123",
    "userMessages": 5,
    "assistantMessages": 5,
    "toolCalls": 12,
    "toolResults": 12,
    "totalMessages": 22,
    "tokens": {
      "input": 50000,
      "output": 10000,
      "cacheRead": 40000,
      "cacheWrite": 5000,
      "total": 105000
    },
    "cost": 0.45,
    "contextUsage": {
      "tokens": 60000,
      "contextWindow": 200000,
      "percent": 30
    }
  }
}
```

`tokens` と `cost` には、セッション全体にわたるアシスタントメッセージ、ツールから報告された使用量、および圧縮／分岐の要約の生成が含まれます。`contextUsage` には、圧縮とフッター表示に使用される実際の現在のコンテキストウィンドウ推定値が含まれます。

モデルまたはコンテキストウィンドウを利用できない場合、`contextUsage` は省略されます。圧縮直後は、圧縮後の新しいアシスタントレスポンスによって有効な使用量データが提供されるまで、`contextUsage.tokens` と `contextUsage.percent` は `null` です。

### export_html

セッションを HTML ファイルにエクスポートします。

```json
{"type": "export_html"}
```

カスタムパスを使用する場合：
```json
{"type": "export_html", "outputPath": "/tmp/session.html"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "export_html",
  "success": true,
  "data": {"path": "/tmp/session.html"}
}
```

### switch_session

別のセッションファイルを読み込みます。`session_before_switch` 拡張機能イベントハンドラーによってキャンセルできます。

```json
{"type": "switch_session", "sessionPath": "/path/to/session.jsonl"}
```

レスポンス：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": false}}
```

拡張機能によって切り替えがキャンセルされた場合：
```json
{"type": "response", "command": "switch_session", "success": true, "data": {"cancelled": true}}
```

### fork

アクティブな分岐上の以前のユーザーメッセージから新しい分岐を作成します。`session_before_fork` 拡張機能イベントハンドラーによってキャンセルできます。分岐元のメッセージのテキストを返します。

```json
{"type": "fork", "entryId": "abc123"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"text": "The original prompt text...", "cancelled": false}
}
```

拡張機能によって分岐がキャンセルされた場合：
```json
{
  "type": "response",
  "command": "fork",
  "success": true,
  "data": {"cancelled": true}
}
```

### clone

現在のアクティブな分岐を、現在位置で新しいセッションに複製します。`session_before_fork` 拡張機能イベントハンドラーによってキャンセルできます。

```json
{"type": "clone"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": false}
}
```

拡張機能によって複製がキャンセルされた場合：
```json
{
  "type": "response",
  "command": "clone",
  "success": true,
  "data": {"cancelled": true}
}
```

### get_fork_messages

分岐に使用できるユーザーメッセージを取得します。

```json
{"type": "get_fork_messages"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_fork_messages",
  "success": true,
  "data": {
    "messages": [
      {"entryId": "abc123", "text": "First prompt..."},
      {"entryId": "def456", "text": "Second prompt..."}
    ]
  }
}
```

### get_entries

すべてのセッションエントリを追加順に取得します（セッションヘッダーを除く）。セッションは安定した ID を持つエントリの追記専用ツリーであるため、エントリ ID は永続的なカーソルとして機能します。最後に確認したエントリ ID を `since` として渡すと、クライアントの再起動をまたいでも、それより後のエントリだけを取得できます。`get_messages` とは異なり、圧縮前の履歴と破棄された分岐も含まれます。

```json
{"type": "get_entries"}
```

カーソルを使用する場合：
```json
{"type": "get_entries", "since": "abc123"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_entries",
  "success": true,
  "data": {
    "entries": [
      {"type": "message", "id": "def456", "parentId": "abc123", "timestamp": "...", "message": {"role": "user", "...": "..."}}
    ],
    "leafId": "def456"
  }
}
```

`leafId` は現在の末端エントリの ID（空のセッションでは `null`）です。これにより、クライアントはアクティブな分岐が移動したかどうかを 1 回のラウンドトリップで判定できます。`since` がどのエントリ ID とも一致しない場合、レスポンスは `success: false` です。

### get_tree

セッションをエントリのツリーとして取得します。各ノードは `{entry, children, label?, labelTimestamp?}` です。ナビゲーション API によって複数のルートが作成される場合があるため、結果は配列です。親チェーンが壊れた孤立エントリもルートとして表示されます。

```json
{"type": "get_tree"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_tree",
  "success": true,
  "data": {
    "tree": [
      {
        "entry": {"type": "message", "id": "abc123", "parentId": null, "...": "..."},
        "children": [
          {"entry": {"type": "message", "id": "def456", "parentId": "abc123", "...": "..."}, "children": []}
        ]
      }
    ],
    "leafId": "def456"
  }
}
```

### get_last_assistant_text

最後のアシスタントメッセージのテキスト内容を取得します。

```json
{"type": "get_last_assistant_text"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_last_assistant_text",
  "success": true,
  "data": {"text": "The assistant's response..."}
}
```

アシスタントのテキストが存在しない場合、`text` の値は `null` です。

### set_session_name

現在のセッションに表示名を設定します。この名前はセッション一覧に表示され、セッションの識別に役立ちます。

```json
{"type": "set_session_name", "name": "my-feature-work"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "set_session_name",
  "success": true
}
```

現在のセッション名は、`get_state` の `sessionName` フィールドで取得できます。RPC モードの開始時に初期名を設定するには、`pi --mode rpc` プロセスに `--name <name>` または `-n <name>` を渡します。

## 検出可能なコマンド

### get_commands

利用可能なコマンド（拡張機能のコマンド、プロンプトテンプレート、スキル）を取得します。名前の先頭に `/` を付け、`prompt` コマンドを通じて実行します。

```json
{"type": "get_commands"}
```

レスポンス：
```json
{
  "type": "response",
  "command": "get_commands",
  "success": true,
  "data": {
    "commands": [
      {
        "name": "fix-tests",
        "description": "Fix failing tests",
        "source": "prompt",
        "sourceInfo": {
          "path": "/home/user/myproject/.pi/agent/prompts/fix-tests.md",
          "source": "local",
          "scope": "project",
          "origin": "top-level"
        }
      }
    ]
  }
}
```

各コマンドには以下の項目があります：
- `name`：コマンド名（`/name` を使用）
- `description`：人が読める説明（拡張機能のコマンドでは省略可能）
- `source`：コマンドの種類：
  - `"extension"`：拡張機能内で `pi.registerCommand()` を介して登録
  - `"prompt"`：プロンプトテンプレートの `.md` ファイルから読み込み
  - `"skill"`：スキルディレクトリから読み込み（名前には `skill:` という接頭辞が付きます）
- `sourceInfo`：コマンドを登録したリソースのメタデータ：
  - `path`：リソースへの絶対パス
  - `source`：Pi がリソースを検出した方法（`"local"`、`"auto"`、`"cli"` など）
  - `scope`：`"user"`、`"project"`、または `"temporary"`
  - `origin`：直接読み込まれたリソースの場合は `"top-level"`、パッケージリソースの場合は `"package"`
  - `baseDir`：該当する場合はパッケージのベースディレクトリ

**注**：組み込みの TUI コマンド（`/settings`、`/hotkeys` など）は含まれません。これらは対話モードでのみ処理され、`prompt` 経由で送信しても実行されません。

## モデルオブジェクト

モデルコマンドは、構成済みモデルの完全な定義を返します。コストは 100 万トークンあたりの米ドル額です。

```json
{
  "id": "claude-sonnet-4-20250514",
  "name": "Claude Sonnet 4",
  "api": "anthropic-messages",
  "provider": "anthropic",
  "baseUrl": "https://api.anthropic.com",
  "reasoning": true,
  "input": ["text", "image"],
  "contextWindow": 200000,
  "maxTokens": 16384,
  "cost": {
    "input": 3.0,
    "output": 15.0,
    "cacheRead": 0.3,
    "cacheWrite": 3.75
  }
}
```

モデルの構成については、[互換性のあるエンドポイントを構成する](models.md#configure-a-compatible-endpoint)を参照してください。TypeScript では、`@earendil-works/pi-ai` からエクスポートされた `Model` 型を使用します。
