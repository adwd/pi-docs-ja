# RPC モード

RPC モードでは、Pi を長時間稼働するサブプロセスとして実行し、stdin と stdout 上の JSON レコードを介して制御します。言語に依存しない統合、プロセス分離、IDE、カスタムユーザーインターフェースに使用します。

プロセス内で Node.js または Bun と統合する場合は、[SDK](sdk.md) を推奨します。サブプロセスベースで TypeScript と統合する場合は、エクスポートされている `RpcClient` を推奨します。これは Pi を起動し、応答を対応付け、型付きのコマンドメソッドを公開し、イベントをリスナーへ配信します。

| インターフェース | プロセス境界 | 制御モデル | 最適な用途 |
|---|---|---|---|
| [SDK](sdk.md) | プロセス内 | TypeScript のメソッドとイベントを直接使用 | API への完全なアクセスを必要とする Node.js または Bun ホスト |
| RPC | 子プロセス | JSONL のコマンド、応答、イベント | その他の言語、分離されたプロセス、IDE、カスタムクライアント |

## RPC モードを開始する

```bash
pi --mode rpc --no-session
```

通常の CLI オプションにより、引き続き作業フォルダー、モデル、ツール、リソース、セッションの動作を選択します。一般的な選択肢には、`--provider`、`--model`、`--name`、`--no-session`、`--session-dir` があります。バージョン固有の完全なインターフェースについては、[コマンドライン](cli.md)を参照してください。インストール済みバージョンについては、`pi --help` が正式な情報源です。

RPC モードでは、`@file` プロンプト引数は拒否されます。代わりに、[`prompt`](rpc-commands.md#prompt) コマンドを介してプロンプトを送信してください。

## プロトコルレコード

このプロトコルには、次の 4 種類のレコードがあります。

| 方向 | レコード | 目的 |
|---|---|---|
| stdin | コマンド | Pi にプロンプトの処理、状態の確認、設定の変更、またはセッションの管理を要求する |
| stdout | `response` | 1 つのコマンドが成功したかどうかを報告し、コマンドのデータがあれば返す |
| stdout | セッションイベント | 実行、メッセージ、ツール、キュー、圧縮、再試行のアクティビティをストリーミングする |
| 双方向 | 拡張機能 UI レコード | Pi とクライアントの間で、サポート対象の拡張機能のインタラクションを転送する |

正式なレコード定義については、[RPC コマンド](rpc-commands.md)、[JSON イベントストリーム](json.md)、[RPC 拡張機能 UI](rpc-extension-ui.md)を参照してください。

### コマンドと応答を対応付ける

すべてのコマンドは、任意の文字列 `id` を受け付けます。対応する応答では、その値が繰り返されます。

```json
{"id":"req-1","type":"get_state"}
{"id":"req-1","type":"response","command":"get_state","success":true,"data":{"...":"..."}}
```

複数のコマンドが同時に未完了になり得る場合は、必ず一意の ID を使用してください。コマンド処理は非同期であるため、クライアントは応答順ではなく ID によって対応付ける必要があります。

セッションイベントはセッションのアクティビティを表すため、通常はコマンド ID を持ちません。`bash_execution_update` は例外です。発生元の [`bash`](rpc-commands.md#bash) コマンドに ID がある場合、その出力イベントでも同じ ID が繰り返されます。

`extension_ui_response` は、その `extension_ui_request` で指定された ID を使用します。通常のコマンド応答は生成しません。

## フレーミング

RPC は厳密な JSONL フレーミングを使用します。レコードごとに完全な JSON オブジェクトを 1 つ書き込み、LF（`\n`）で終端してください。stdout をバイトストリームまたは UTF-8 ストリームとして読み取り、LF のみでレコードを分割してください。CRLF 入力を受け付けるには、直前にある任意のキャリッジリターンを取り除きます。

Unicode の行区切り文字または段落区切り文字をレコード境界として扱う汎用の行リーダーは使用しないでください。特に、Node.js の `readline` は `U+2028` と `U+2029` でも分割しますが、これらは JSON 文字列内で有効です。

stdout を継続的に読み取ってください。Pi は stdout のバックプレッシャーに従いますが、クライアントが読み取りを停止するとプロセスが停止する可能性があります。コマンドの書き込み時には stdin のバックプレッシャーに従ってください。stdout はプロトコルレコード専用です。診断情報とアプリケーションログは stderr に出力されます。

## 実行ライフサイクル

`prompt` の応答が成功したことは、プロンプトが受理、キュー投入、または処理されたことを意味します。モデルの処理が完了したことを意味するわけではありません。

```json
{"id":"req-2","type":"prompt","message":"Review this repository"}
{"id":"req-2","type":"response","command":"prompt","success":true,"data":{"disposition":"started"}}
```

`data.disposition` は、プロンプトがどのように処理されたかを示します。値が `"handled"` の場合、このプロンプトに対する実行は開始されていないため、`agent_settled` を待たないでください。すべての値については、[RPC コマンド](rpc-commands.md#prompt)を参照してください。

その応答の後も、[イベント](json.md)の受信を続けてください。`agent_end` は低レベルのエージェント実行 1 回の終了を示しますが、その後も再試行、オーバーフローからの復旧、圧縮、ステアリング、またはフォローアップ処理が続く場合があります。Pi が自動的に処理を続行しないことをクライアントが確認する必要がある場合は、`agent_settled` を待ってください。

迅速な完了を見逃さないよう、プロンプトを送信する前にサブスクライブしてください。`RpcClient.promptAndWait()` はこれを内部で行います。個別の `RpcClient` 呼び出しを使用する場合は、`prompt()` より前にイベントリスナーを設定し、実行中にのみ `waitForIdle()` を呼び出してください。

## エラー

コマンドが失敗すると、`success: false` を含む応答が 1 つ返されます。

```json
{"id":"req-3","type":"response","command":"set_model","success":false,"error":"Model not found: invalid/model"}
```

不正な JSON に対しては、リクエスト ID のない解析応答が生成されます。

```json
{"type":"response","command":"parse","success":false,"error":"Failed to parse command: Unexpected token..."}
```

成功応答が示すのは、コマンド処理についてのみです。プロンプトが受理された後のプロバイダー障害や中止は、メッセージおよびイベントストリームに現れます。

クライアントは、子プロセスの起動失敗、予期しない終了、stderr の診断情報、キャンセル、およびクライアント独自の期限も処理する必要があります。stderr をプロトコルデータとして解析しないでください。

## シャットダウン

正常なシャットダウンを要求するには、子プロセスの stdin を閉じます。Pi は終了前にアクティブなランタイムを破棄します。クライアントは、プロセスシグナルや予期しない終了にも対処する必要があります。

拡張機能は、その拡張機能コンテキストを介してシャットダウンを要求することもできます。Pi は、現在のコマンドの完了後、またはアクティブな実行が `agent_settled` を発行した後にシャットダウンを完了します。

## 最小構成のクライアント

次の Python の例ではバイナリパイプリーダーを使用します。これは Unicode 区切り文字をプロトコル境界として扱わず、LF で分割します。

```python
import json
import subprocess

process = subprocess.Popen(
    ["pi", "--mode", "rpc", "--no-session"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
)

assert process.stdin is not None
assert process.stdout is not None

command = {"id": "prompt-1", "type": "prompt", "message": "Hello"}
process.stdin.write(json.dumps(command).encode("utf-8") + b"\n")
process.stdin.flush()

while line := process.stdout.readline():
    record = json.loads(line)
    if record.get("type") == "message_update":
        update = record["assistantMessageEvent"]
        if update["type"] == "text_delta":
            print(update["delta"], end="", flush=True)
    elif record.get("type") == "agent_settled":
        print()
        break

process.stdin.close()
process.wait()
```

保守されている TypeScript クライアントについては、検証済みの [RPC クライアントの例](../examples/rpc-client.ts)を使用してください。リポジトリの例は `dist/cli.js` を参照するため、ビルド済みの Pi CLI が必要です。

## リファレンス

- [RPC コマンド](rpc-commands.md)：すべての stdin コマンドと応答
- [JSON イベントストリーム](json.md)：共有される stdout セッションイベントとストリーミングの再構築
- [RPC 拡張機能 UI](rpc-extension-ui.md)：ダイアログ、通知、応答、制限事項
- [メッセージ型](message-types.md)：応答とイベントで使用されるメッセージおよびコンテンツブロック
- [セッションファイル形式](session-format.md)：セッションコマンドが返すエントリ
- [`rpc-types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-types.ts)：エクスポートされた TypeScript プロトコル定義
- [`RpcClient`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-client.ts)：サブプロセスクライアントの実装

## 移動されたリファレンスアンカー

以前このページにあった詳細なリファレンスには、個別のページが用意されました。以下のアンカーは既存のリンクを維持するためのものです。

<a id="prompt"></a>
<a id="steer"></a>
<a id="follow_up"></a>
<a id="abort"></a>
<a id="clear_queue"></a>
<a id="new_session"></a>
<a id="get_state"></a>
<a id="get_messages"></a>
<a id="set_model"></a>
<a id="cycle_model"></a>
<a id="get_available_models"></a>
<a id="set_thinking_level"></a>
<a id="cycle_thinking_level"></a>
<a id="get_available_thinking_levels"></a>
<a id="set_steering_mode"></a>
<a id="set_follow_up_mode"></a>
<a id="compact"></a>
<a id="set_auto_compaction"></a>
<a id="set_auto_retry"></a>
<a id="abort_retry"></a>
<a id="bash"></a>
<a id="abort_bash"></a>
<a id="get_session_stats"></a>
<a id="export_html"></a>
<a id="switch_session"></a>
<a id="fork"></a>
<a id="clone"></a>
<a id="get_fork_messages"></a>
<a id="get_entries"></a>
<a id="get_tree"></a>
<a id="get_last_assistant_text"></a>
<a id="set_session_name"></a>
<a id="get_commands"></a>

コマンドの詳細は [RPC コマンド](rpc-commands.md)に移動しました。

<a id="message_update-streaming"></a>
<a id="bash_execution_update"></a>
<a id="compaction_start--compaction_end"></a>
<a id="summarization_retry_scheduled--summarization_retry_attempt_start--summarization_retry_finished"></a>

イベントの詳細は [JSON イベントストリーム](json.md)に移動しました。

<a id="extension-ui-protocol"></a>

拡張機能のインタラクションの詳細は [RPC 拡張機能 UI](rpc-extension-ui.md)に移動しました。
