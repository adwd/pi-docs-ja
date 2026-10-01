# 環境変数

Pi は環境変数を次の 3 つの方法で使用します。

- `PI_OFFLINE` などの変数で Pi プロセスを設定します。
- 子プロセスが Pi を起動元のエージェントとして識別できるように、Pi はプロセスマーカーを設定します。
- LLM から呼び出せるシェルツールが実行するコマンドは、現在のセッションを表す `PI_*` 変数を受け取ります。

プロバイダーの API キー用変数については、[プロバイダー認証](providers.md#use-an-api-key-from-the-environment)に別途記載しています。

## プロセスマーカー

CLI と RPC のエントリーポイントは、次の 2 つのプロセスマーカーを設定します。

- `AI_AGENT=pi` は、プロセスを起動したエージェントが Pi であることをツールが識別できるようにする汎用マーカーです。
- `PI_CODING_AGENT=true` は Pi 固有のマーカーで、子プロセスが Pi 内で実行されていることを検出できるようにします。

子プロセスは両方のマーカーを継承します。これらはセッション固有ではなく、SDK を介して Pi を組み込んだ場合には自動的に設定されません。

## シェルツールのセッション環境

`bash` ツールと `powershell` ツールが実行するコマンドは、現在の Pi セッションの状態を受け取ります。

| 変数 | 説明 |
|----------|-------------|
| `PI_SESSION_ID` | 現在のセッション ID |
| `PI_SESSION_FILE` | 現在のセッションの JSONL ファイルへの絶対パス。一時セッションでは未設定 |
| `PI_PROVIDER` | 現在選択されているモデルプロバイダー |
| `PI_MODEL` | 現在選択されているモデル ID |
| `PI_REASONING_LEVEL` | 現在有効な推論レベル：`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、または `max` |

値は各コマンドの開始時に解決されます。そのため、モデルの切り替えや推論レベルの変更は、Pi を再起動しなくても次のシェルコマンドに反映されます。`PI_PROVIDER` と `PI_MODEL` が示すのは選択された Pi モデルであり、ルーターが内部で選択する可能性のある別の上流モデルではありません。

実行中のモデルまたはプロバイダーを尋ねられた場合は、システムプロンプトから答えを推測せず、これらの変数を確認してください。

```bash
printf '%s/%s\n' "$PI_PROVIDER" "$PI_MODEL"
printf 'reasoning=%s session=%s\n' "$PI_REASONING_LEVEL" "$PI_SESSION_ID"
```

セッションが永続的な場合は、セッションファイルを直接確認できます。

```bash
if [ -n "$PI_SESSION_FILE" ]; then
  tail -n 1 "$PI_SESSION_FILE"
fi
```

これらの変数は、LLM から呼び出せる `bash` ツールと `powershell` ツールに注入されます。ユーザーが入力した `!` コマンドまたは `!!` コマンドには注入されません。

### カスタムシェルツール

`createBashTool()` または `createPowerShellTool()` で作成したツールを Pi に登録すると、デフォルトでセッション環境が公開されます。注入は `spawnHook` より前に行われるため、フックは `ctx.env` で変数を受け取ります。

```typescript
const bashTool = createBashTool(cwd, {
  spawnHook: (ctx) => ({
    ...ctx,
    env: { ...ctx.env, CI: "1" },
  }),
});
```

スポーンフックとは独立してセッションメタデータを無効にします：

```typescript
const powershellTool = createPowerShellTool(cwd, {
  exposeSessionEnvironment: false,
  spawnHook: (ctx) => ctx,
});
```

無効にすると、ネストされた Pi プロセスが古い親セッションのメタデータを公開しないように、Pi はこれらの変数の継承値を削除します。

## Pi プロセスの設定

次の変数は Pi 自体によって読み取られます。

| 変数 | 説明 |
|----------|-------------|
| `PI_CODING_AGENT_DIR` | 設定ディレクトリを上書きします。デフォルトは `~/.pi/agent` です |
| `PI_CODING_AGENT_SESSION_DIR` | セッションの保存先を上書きします。`--session-dir` によって上書きされます |
| `PI_PACKAGE_DIR` | パッケージディレクトリを上書きします。Nix/Guix のストアパスに便利です |
| `PI_OFFLINE` | モデルカタログの更新を含む、自動的なネットワークアクティビティを無効にします |
| `PI_SKIP_VERSION_CHECK` | `pi.dev` への最新バージョンのリクエストを無効にします |
| `PI_TELEMETRY` | インストール／更新のテレメトリとプロバイダー帰属ヘッダーを上書きします：`1`／`true`／`yes` または `0`／`false`／`no` |
| `PI_CACHE_RETENTION` | サポートされている場合にプロバイダーのプロンプトキャッシュを延長するには、`long` に設定します |
| `PI_SHARE_VIEWER_URL` | `/share` が使用するベース URL を上書きします |
| `PI_RADIUS_GATEWAY` | `/bug` によるアップロードと Radius リレー接続に使用する Radius ゲートウェイのオリジンを上書きします |
| `PI_HARDWARE_CURSOR` | ハードウェアカーソルを表示するには `1` に設定します。[ターミナルのセットアップ](terminal-setup.md)を参照してください |
| `PI_HYPERLINKS` | OSC 8 ハイパーリンクの検出を `1`、`0`、または `auto` で上書きします |
| `PI_IMAGE_PROTOCOL` | インライン画像の検出を `kitty`、`iterm2`、`none`、または `auto` で上書きします |
| `PI_TRUE_COLOR` | トゥルーカラーの検出を `1`、`0`、または `auto` で上書きします |
| `PI_TUI_ESC_TIMEOUT` | 単独の ESC を Escape として扱うまでの待機時間（ミリ秒）。デフォルトは SSH 経由では `100`、それ以外では `10` です。Alt キー入力が Escape と誤認される場合は増やしてください |
| `VISUAL`、`EDITOR` | `externalEditor` が未設定の場合に使用する外部エディターのフォールバック |
| `HTTP_PROXY`、`HTTPS_PROXY` | 外向きの HTTP リクエストをプロキシします |

`ANTHROPIC_API_KEY`、`OPENAI_API_KEY`、クラウドプロバイダーの設定などのプロバイダー認証情報は、[プロバイダー認証](providers.md#use-an-api-key-from-the-environment)に記載しています。
