# 設定リファレンス

このリファレンスでは、ユーザーが設定できる項目、その型、デフォルト値、用途を示します。プロジェクト設定はエージェントディレクトリの設定を上書きします。リソースのリストは結合されます。ファイルの場所と信頼の動作については、[設定](configuration.md)を参照してください。

## モデルと思考

<a id="model-cycling"></a>

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `defaultProvider` | 文字列 | 自動 | 起動時の AI プロバイダー。 |
| `defaultModel` | 文字列 | 自動 | 起動時のモデル ID。 |
| `defaultThinkingLevel` | `"off" \| "minimal" \| "low" \| "medium" \| "high" \| "xhigh" \| "max"` | `"medium"` | 起動時の思考レベル。 |
| `modelThinkingLevels` | オブジェクト | なし | 正確な `provider/modelId` をキーとする、モデルごとの起動時思考レベル。 |
| `thinkingBudgets` | オブジェクト | 組み込みの予算 | `minimal`、`low`、`medium`、`high` の各思考レベルのトークン予算。 |
| `enabledModels` | `string[]` | 利用可能なすべてのモデル | 起動時の選択とモデルの切り替えに使用するモデルパターン。`--models` と同じ形式を使用します。 |
| `hideThinkingBlock` | ブール値 | `false` | トランスクリプト内の思考ブロックを非表示にします。 |
| `showCacheMissNotices` | ブール値 | `false` | 重大なキャッシュミス、キャッシュウォーミングの成功、圧縮の使用、プロバイダーの復旧に関する通知を表示します。 |
| `cacheWarming` | `"off" \| "streaming" \| "idle"` | `"streaming"` | 実行中、または `"idle"` の場合は実行間で、対象となるプロバイダーのプロンプトキャッシュをウォーム状態に保ちます。グローバル設定でのみ指定できます。 |

キャッシュウォーミングは、モデルがキャッシュの有効期間を宣言し、キャッシュミスの回避によって少なくとも $0.05 のコストを削減できると Pi が見積もった場合にのみ実行されます。更新の使用量はセッション合計に算入されますが、モデルのコンテキストには入りません。`/session` には次の判断が表示されます。拡張機能は `cache_warming_decision` でその判断を上書きできます。[プロンプトキャッシュの有効期間](models.md#prompt-cache-lifetimes)を参照してください。

モデルの選択と思考の制御については、[モデルの選択](models.md)を参照してください。

## 操作

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `steeringMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | キューに入ったステアリングメッセージの配信方法。 |
| `followUpMode` | `"all" \| "one-at-a-time"` | `"one-at-a-time"` | キューに入ったフォローアップメッセージの配信方法。 |
| `externalEditor` | 文字列 | `$VISUAL`、`$EDITOR`、続いてプラットフォームのデフォルト | 外部エディターのキーバインドで開くコマンド。 |
| `doubleEscapeAction` | `"tree" \| "fork" \| "none"` | `"tree"` | エディターが空のときに Escape を 2 回押した場合のアクション。 |
| `treeFilterMode` | `"default" \| "no-tools" \| "user-only" \| "labeled-only" \| "all"` | `"default"` | `/tree` で使用する初期フィルター。 |
| `defaultProjectTrust` | `"ask" \| "always" \| "never"` | `"ask"` | プロジェクトの信頼に関するフォールバック動作。**エージェントディレクトリの設定でのみ指定できます。** |

## ツール

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `defaultTools` | `string[]` | `read`、`bash`、`edit`、`write` | 起動時に有効にするツール。修飾のない名前を指定するとデフォルトが置き換えられ、`+name` はツールを追加し、`-name` はツールを削除します。空の配列を指定すると、すべての組み込みツールが無効になりますが、拡張機能または SDK のツールは無効になりません。 |
| `codemode.mode` | `"on"` \| `"only"` | `"on"` | `codemode` ツールが有効な間にツールを提示する方法。`on`：宣言済みツールでは、その `codemode` 宣言が説明に追加され、`codemode` には宣言されていないツールのみが表示されます。`only`：`codemode` にはスクリプトから呼び出せるすべてのツールが表示され、有効な組み込みツールと拡張機能ツールはモデルから非表示になるため、モデルは `codemode` を介してそれらを利用します。 |
| `codemode.inlineBudget` | 数値 | `3000` | `codemode` ツールの説明でツール宣言に使用できる推定トークン数（文字数 / 4）。収まらないツールは除外され、`searchTools()` で検索されます。`0` を指定すると名前空間のみが表示されます。 |

利用可能な組み込みツールは、`read`、`bash`、`powershell`、`edit`、`write`、`grep`、`find`、`ls` です。`defaultTools` には、組み込み拡張機能によって非アクティブとして登録される `codemode` と `tool_search`、および非アクティブとして登録されるその他の拡張機能ツールも指定できます。

`+name` と `-name` のエントリだけで構成されるリストは、継承した選択を置き換えるのではなく変更します。たとえば、次の設定ではデフォルトのツールに加えて `codemode` を有効にします。

```json
{
  "defaultTools": ["+codemode"]
}
```

これは `bash` を `powershell` に置き換え、`grep` を有効にします：`["-bash", "+powershell", "+grep"]`。プロジェクト設定はユーザー設定の上に適用されます。`+name` と `-name` のエントリだけを含むプロジェクトのリストはユーザーの選択を変更し、修飾のない名前を含むプロジェクトのリストはそれを置き換えます。1 つのリスト内では、修飾のない名前によって選択内容が構成され、その後 `+name` と `-name` が順番に適用されます。

`/reload` は、`defaultTools` に新たに追加されたツールを有効にします。そこから削除されたツールを無効にしたり、ユーザーが無効にしたまま変更されていないツールを再度有効にしたりすることはありません。`--tools`、`--no-tools`、`--no-builtin-tools` は、再読み込み時にも `defaultTools` を上書きします。

CLI のツールオプションは、1 回の呼び出しに限りこの設定を上書きします。`--tools` は `+name` または `-name` を受け付けません。[コマンドライン](cli.md#tools)を参照してください。

## セッションとコンテキスト

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `sessionDir` | 文字列 | エージェントのセッションディレクトリ | セッションの保存先ディレクトリ。相対パスは作業ディレクトリを基準に解決されます。`PI_CODING_AGENT_SESSION_DIR` と `--session-dir` はこの設定を上書きします。 |

### 圧縮

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `compaction.enabled` | ブール値 | `true` | 自動圧縮を有効にします。 |
| `compaction.reserveTokens` | 数値 | `16384` | モデルの応答用に予約するトークン数。 |
| `compaction.keepRecentTokens` | 数値 | `20000` | 要約せずに保持する直近のトークン数。 |
| `compaction.modelOverrides` | オブジェクト | なし | 正確な `provider/modelId` をキーとする、モデルごとのトークン設定。 |

<a id="per-model-compaction-overrides"></a>

圧縮のトークン値は、非負の安全な整数でなければなりません。各値は、一致するモデルの上書き設定、通常の圧縮設定、組み込みのデフォルトの順に、それぞれ独立して解決されます。プロジェクトとユーザーのオブジェクトは、モデルを検索する前にマージされます。

トリガー、要約、検証の動作については、[圧縮リファレンス](compaction.md)を参照してください。

### 分岐の要約

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `branchSummary.reserveTokens` | 数値 | `16384` | 分岐履歴を要約するときに予約するトークン数。 |
| `branchSummary.skipPrompt` | ブール値 | `false` | 分岐の要約プロンプトを省略し、デフォルトで要約なしにします。 |

## ターミナルと表示

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `theme` | 文字列 | `"system"` | 組み込みまたはカスタムのテーマ名。`system` はターミナルのテーマから色を導出します。 |
| `quietStartup` | ブール値 | `false` | 起動時のヘッダーを非表示にします。 |
| `tuiMode` | `"regular" \| "fullscreen"` | `"regular"` | 対話型ターミナル UI のモード。 |
| `fullscreenExitOutput` | `"transcript" \| "resume-hint"` | `"transcript"` | フルスクリーンモードの終了時に出力する内容。 |
| `fullscreenScrollbar` | `"auto" \| "always" \| "hidden"` | `"auto"` | フルスクリーンのトランスクリプトにおけるスクロールバーの動作。 |
| `fullscreenCopyOnSelect` | ブール値 | `true` | フルスクリーンモードで選択したテキストを自動的にコピーします。 |
| `fullscreenWheelScrollLines` | `"auto"` \| 数値 | `"auto"` | フルスクリーンモードでマウスホイールイベントごとにスクロールする行数。1～100 の範囲です。`"auto"` は、ホイールとトラックパッドの入力がすでに加速されるローカルの macOS ターミナルでは、イベントごとに 1 行移動します。それ以外の環境および SSH 経由では、ホイールを速く回したときにイベントごとに最大 6 行まで加速します。Alt+ホイールでは 5 倍の距離を移動します。 |
| `editorPaddingX` | 数値 | `0` | エディターの水平方向のパディング。0～3 セルです。 |
| `outputPad` | `0 \| 1` | `1` | トランスクリプトの水平方向のパディング。 |
| `autocompleteMaxVisible` | 数値 | `5` | 表示するオートコンプリート候補の数。3～20 の範囲です。 |
| `showHardwareCursor` | ブール値 | `false` | Pi が入力メソッド向けに配置する間、ターミナルカーソルを表示します。 |
| `terminal.showImages` | ブール値 | `true` | サポートされている場合にインライン画像を表示します。 |
| `terminal.imageWidthCells` | 数値 | `60` | ターミナルセル単位で指定する、インライン画像の推奨幅。 |
| `terminal.clearOnShrink` | ブール値 | `false` | レンダリングされたコンテンツが縮小したときに空の行を消去します。 |
| `terminal.showTerminalProgress` | ブール値 | `false` | ターミナルのタブに OSC 9;4 の進捗状況を表示します。 |
| `terminal.hyperlinks` | `boolean \| "auto"` | `"auto"` | OSC 8 ハイパーリンクの検出を上書きします。 |
| `terminal.images` | `"kitty" \| "iterm2" \| "auto" \| false` | `"auto"` | インライン画像プロトコルの検出を上書きします。 |
| `terminal.trueColor` | `boolean \| "auto"` | `"auto"` | トゥルーカラーの検出を上書きします。 |
| `images.autoResize` | ブール値 | `true` | モデルに送信する前に、画像を最大 2000 × 2000 ピクセルにサイズ変更します。 |
| `images.blockImages` | ブール値 | `false` | モデルへの画像送信を防止します。 |
| `markdown.codeBlockIndent` | 文字列 | `"  "` | レンダリングされたコードブロックのインデントに使用する接頭辞。 |
| `markdown.mermaid` | `"off" \| "final" \| "streaming"` | `"streaming"` | Mermaid のレンダリングモード。 |

形式とプラットフォームの詳細については、[テーマ](themes.md)と[ターミナルのセットアップ](terminal-setup.md)を参照してください。

## ネットワークと再試行

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `transport` | `"auto" \| "sse" \| "websocket" \| "websocket-cached"` | `"auto"` | 複数のトランスポートをサポートする AI プロバイダーで優先するトランスポートです。 |
| `httpProxy` | 文字列 | なし | Pi が管理する HTTP クライアントに `HTTP_PROXY` および `HTTPS_PROXY` として適用されるプロキシ URL です。**エージェントディレクトリの設定でのみ指定できます。** |
| `httpIdleTimeoutMs` | 数値 | `300000` | HTTP ヘッダーおよび本文のアイドルタイムアウト（ミリ秒）です。無効にするには `0` に設定します。 |
| `websocketConnectTimeoutMs` | 数値 | `15000` | WebSocket 接続のタイムアウト（ミリ秒）です。無効にするには `0` に設定します。 |
| `retry.enabled` | 真偽値 | `true` | 一時的な障害に対するエージェントレベルの自動再試行を有効にします。 |
| `retry.maxRetries` | 数値 | `3` | エージェントレベルの再試行回数の上限です。 |
| `retry.baseDelayMs` | 数値 | `2000` | 指数バックオフの初期遅延時間（ミリ秒）です。 |
| `retry.maxAgentDelayMs` | 数値 | `60000` | エージェントレベルの再試行遅延時間の上限（ミリ秒）です。 |
| `retry.provider.timeoutMs` | 数値 | `httpIdleTimeoutMs` | プロバイダーへのリクエストのタイムアウト（ミリ秒）です。 |
| `retry.provider.maxRetries` | 数値 | `0` | プロバイダーレベルの再試行回数です。 |
| `retry.provider.maxRetryDelayMs` | 数値 | `60000` | サーバーが要求する遅延時間の上限（ミリ秒）です。上限を無効にするには `0` に設定します。 |

プロバイダーレベルの再試行が必要でない限り、`retry.provider.maxRetries` は `0` のままにしてください。プロバイダー側で再試行すると、Pi 自身によるクォータおよび使用量上限エラーの処理が遅れることがあります。

## シェル

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `shellPath` | 文字列 | プラットフォームのデフォルト | カスタムシェルの実行ファイルパスです。先頭の `~` をサポートします。 |
| `shellCommandPrefix` | 文字列 | なし | すべてのシェルコマンドの先頭に付加するプレフィックスです。 |
| `npmCommand` | `string[]` | `npm` | npm パッケージの検索とインストールに使用するコマンドおよび引数です。 |

シェルの設定については[シェルエイリアス](shell-aliases.md)、パッケージマネージャーの動作については[Pi パッケージ](packages.md)を参照してください。

## リソース

ユーザー設定内のリソースパスは、エージェントディレクトリを基準に解決されます。プロジェクト設定内のパスは、プロジェクトの `.pi` ディレクトリを基準に解決されます。絶対パスおよび `~` をサポートします。

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `packages` | 配列 | `[]` | npm、git、またはローカルの Pi パッケージソースです。[Pi パッケージ](packages.md)を参照してください。 |
| `extensions` | `string[]` | `[]` | 拡張機能のファイルまたはディレクトリです。 |
| `skills` | `string[]` | `[]` | スキルのファイルまたはディレクトリです。 |
| `prompts` | `string[]` | `[]` | プロンプトテンプレートのファイルまたはディレクトリです。 |
| `themes` | `string[]` | `[]` | テーマのファイルまたはディレクトリです。 |
| `enableSkillCommands` | 真偽値 | `true` | スキルを `/skill:name` コマンドとして登録します。 |

リソース配列では、`!pattern` による glob 除外、`+path` による完全一致の対象の追加、`-path` による完全一致の対象の除外をサポートします。Pi は、ユーザーレベルとプロジェクトの両方の設定に記載されたリソースを読み込みます。

組み込み拡張機能は、`extensions` 内では `builtin:mcp`、`builtin:llama.cpp`、`builtin:codemode`、`builtin:tool-search` という名前です。これらはデフォルトで読み込まれ、`-builtin:mcp` を指定すると、そのうちの 1 つが無効になります。プロジェクト設定の `+builtin:<name>` または `-builtin:<name>` エントリは、ユーザー設定を上書きします。`pi config` では、これらが「組み込み」の下に一覧表示されます。`--no-extensions` でも無効にでき、`-e builtin:<name>` を指定すると 1 つを明示的に読み込みます。

## 更新、テレメトリ、警告

| 設定 | 型 | デフォルト | 説明 |
|---|---|---|---|
| `collapseChangelog` | 真偽値 | `false` | 更新後に要約された変更履歴を表示します。 |
| `enableInstallTelemetry` | 真偽値 | `true` | 匿名のインストール／更新レポートと、選択したプロバイダーの帰属ヘッダーを有効にします。更新チェックは制御しません。 |
| `enableAnalytics` | 真偽値 | `false` | 分析データの共有にオプトインします。現在は、試験的な初回実行時のセットアップでのみ使用されます。 |
| `warnings.anthropicExtraUsage` | 真偽値 | `true` | Anthropic のサブスクリプション認証で有料の追加使用量が発生する可能性がある場合に警告します。 |
