# MCP サーバー

Pi は、stdio またはストリーミング可能な HTTP を介して [Model Context Protocol](https://modelcontextprotocol.io) サーバーに接続し、そのツールとリソースをモデルから利用できるようにします。

## クイックセットアップ

ローカルの stdio サーバーを追加し、接続を確認してから Pi を起動します。

```bash
pi mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem .
pi mcp list
pi
```

リモートサーバーの場合：

```bash
pi mcp add docs --url https://example.com/mcp --bearer-token-env-var DOCS_TOKEN
pi mcp list
```

これらのコマンドは、デフォルトではユーザーレベルのサーバーを追加します。代わりにプロジェクト設定へ書き込むには、`--local` または `-l` を追加します。

```bash
pi mcp add -l tools --env API_KEY='${TOOLS_KEY}' -- uvx tools-mcp
```

対話型セッション内で `/mcp` を使用すると、接続の確認、サインイン、再接続、公開範囲の変更、サーバーの有効化と無効化ができます。セッション外でサーバーを追加、削除、または変更した後は、`/reload` を実行します。

## サーバーを設定する

Pi は、ユーザーレベルのサーバーを `~/.pi/agent/mcp.json` から、プロジェクトのサーバーを `.pi/mcp.json` から読み取ります。プロジェクト設定は、[プロジェクトの信頼](security.md#understand-project-trust)が付与された後にのみ読み取られます。プロジェクトのエントリは、同じ名前のユーザーレベルのエントリを置き換えます。

形式は他の MCP クライアントと同じです。

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    },
    "docs": {
      "url": "https://example.com/mcp",
      "headers": { "Authorization": "Bearer ${DOCS_TOKEN}" },
      "description": "Search and read the product documentation"
    }
  }
}
```

stdio サーバーでは、`command`、`args`、`env`、`cwd` を使用します。相対的な `cwd` 値は、セッションディレクトリを基準に解決されます。`command`、引数、または `cwd` の先頭にある `~/` は、ホームディレクトリを表します。

HTTP サーバーでは、`url`、`headers`、`oauth` を使用します（[OAuth で認証する](#authenticate-with-oauth)を参照）。従来の SSE トランスポートはサポートされていません。

どちらの種類のサーバーも、以下をサポートします。

- `timeout`：リクエストごとのタイムアウト（秒、デフォルトは 60）。進捗通知を受信するとリセットされます。
- `enabled: false`：接続せずにエントリを保持します。
- `exposure` と `toolExposure`：モデルがツールにアクセスする方法を制御します（[ツールの公開範囲を制御する](#control-tool-exposure)を参照）。
- `description`：サーバーが提供する内容を 1 文で表します。これにより、システムプロンプトにサーバーが掲載され（[ツールの公開範囲を制御する](#control-tool-exposure)を参照）、ツール検索ではこの説明に基づいてサーバーのツールが順位付けされ、codemode の `describeNamespace()` はこの説明を返します。指定しない場合、サーバーへの接続後は、サーバーの指示の最初の行が使用されます。

個人用サーバーと認証情報を含むサーバーは、ユーザーレベルのファイルに保持してください。プロジェクトファイルは、そのプロジェクトに必要なサーバーにのみ、かつ信頼できるプロジェクトでのみ使用してください。

### 設定ルール

- サーバー名に使用できるのは、英字、数字、`_`、`-` のみです。ツール名は `mcp__<server>__<tool>` となり、英字、数字、`_` 以外の文字はすべて `_` に置き換えられます。この置換後に名前が衝突するツールには、それぞれハッシュ接尾辞が付きます。`-` と `_` の違いしかないサーバー名は、同じサーバーとして扱われます。2 つ目は拒否され、`mcp.json` のサーバーは登録済みのサーバーを上書きします。
- `type` は省略可能です。`command` を指定すると stdio、`url` を指定するとストリーミング可能な HTTP が選択されます。`type` を指定する場合は、`stdio`、`http`、`streamable-http` のいずれかでなければなりません。
- `sse` は拒否されます。SSE エンドポイントを記載しているサーバーでも、多くの場合はストリーミング可能な HTTP も提供しており、通常は `/sse` ではなく `/mcp` にあります。
- `command` は 1 つの実行可能ファイルであり、`args` にはその引数を指定します。シェルコマンド文字列ではありません。
- `env` と `headers` の値には、`${GITHUB_TOKEN}` のような環境変数を使用できます。`!command` でコマンドを実行することもできますが、コマンドが値全体を構成する必要があります。例：`"Authorization": "!echo Bearer $(gh auth token)"`。
- 無効なエントリは報告されてスキップされますが、他のサーバーの接続は妨げません。

`pi mcp add` と `pi mcp remove` で、シェルから行う一般的な変更に対応できます。各オプションについては、[MCP コマンド](cli.md#mcp-commands)を参照してください。

### サーバーを確認または変更する

`/mcp` は、設定済みのサーバーを、その状態、ツール数、公開範囲、設定元とともに一覧表示します。対応が必要なサーバーが先に表示されます。サーバーを選択すると、そのツールと接続の詳細の確認、再接続、サインインまたはサインアウト、公開範囲の変更、有効化と無効化ができます。

公開範囲と有効状態の変更は、無関係な内容を置き換えることなく、そのサーバーを定義しているファイルに保存されます。無効なサーバーも一覧に残ります。対話型 TUI の外部では、`/mcp` はサーバーの状態を表示し、`/mcp login <server>`、`/mcp logout <server>`、`/mcp reconnect <server>` はそれぞれの操作を直接実行します。

シェルコマンドはセッションなしでも動作します：`pi mcp add`、`pi mcp remove`、`pi mcp list`、`pi mcp login`、`pi mcp logout`。シェルコマンドは拡張機能を読み込みません。

### 接続の問題を診断する

`pi mcp list` を実行すると、有効なすべてのサーバーに接続し、その状態、ツール、エラーを表示します。エントリが無効な場合、または有効なサーバーが接続されていない場合は、ステータス 1 で終了します。`/mcp` は、接続エラーの全文と、接続に失敗した stdio サーバーの stderr の末尾を表示します。

Pi は、設定エラー、接続失敗、必要なサインインを起動後に一度報告します。サーバーのログ通知は、`<time> [<server>] <level> <logger>: <message>` の形式で `~/.pi/agent/mcp.log` に追記されます。ファイルが 5 MB を超えると、`mcp.log.1` に移動されます。

Pi はセッションの開始時に、有効なすべてのサーバーへバックグラウンドで接続します。サーバーのツールは接続後に表示されます。`codemode` の説明にはツールが列挙されないため、サーバーが接続されても変化しません。最初のプロンプトが最大 10 秒待機するのは、リクエスト内で宣言する必要がある `direct` ツールを持つサーバーだけです。他のサーバーについては、必要になった時点で待機します。codemode スクリプトは、名前を指定したサーバー（`mcp__<server>`）を待機し、`searchTools()` を呼び出すか `ALL_TOOLS` を読み取る場合は、すべてのサーバーを待機します。`tool_search` とリソースツールも、すべてのサーバーを待機します。HTTP ネットワークエラーと一時的なステータス（408、429、5xx）は 2 回再試行されます。切断された接続は未接続として表示され、次の呼び出し時に再接続されます。サーバーがツール一覧の変更を通知すると、新しいツールが追加され、取り下げられたツールにはアクセスできなくなります。

stdio サーバーを停止すると、その stdin を閉じ、SIGTERM を送信した後、そのプロセスグループに SIGKILL を送信します。これにより、`npx` や `uvx` などのラッパー経由で起動されたサーバーも停止します。

## 別のクライアントから設定を移行する

変換したエントリを `mcp.json` 内の `mcpServers` の下に移動し、`pi mcp list` を実行して検証します。

| クライアント | 変換方法 |
|---|---|
| Claude Desktop、Claude Code、または Cursor | 既存の `mcpServers` エントリをコピーします。 |
| VS Code | トップレベルの `servers` オブジェクトからエントリを移動し、`${input:...}` プロンプトを `${NAME}` 環境変数に置き換えます。 |
| Codex | `command`、`args`、`env`、`url` などの `[mcp_servers.<name>]` TOML フィールドを JSON に変換します。 |
| OpenCode | `"type": "local"` を stdio エントリに変換し、その `command` 配列を `command` と `args` に分割し、`environment` を `env` に変更し、`{env:NAME}` を `${NAME}` に置き換えます。`"type": "remote"` は URL エントリに変換します。 |

## OAuth で認証する

Sentry などの OAuth を使用するリモートサーバーでは、`mcp.json` に認証情報を指定する必要はありません。

```json
{
  "mcpServers": {
    "sentry": { "url": "https://mcp.sentry.dev/mcp" }
  }
}
```

サーバーが未認証の接続を拒否すると、`/mcp` にサインインが必要であることが表示されます。「サインイン」を選択するか、`/mcp login sentry` または `pi mcp login sentry` を実行します。Pi は認可ページを開き、承認を待機します。SSH 経由の場合など、ブラウザーが別のマシンで動作している場合は、リダイレクト先の URL をサインイン画面に貼り付けます。実行中のセッションでは、次のターンから新しい認証情報が使用されます。

Pi は自身を認可サーバーに登録し、トークンを `~/.pi/agent/mcp-auth.json` に保存します。また、アクセストークンの有効期限が切れた場合やサーバーに拒否された場合には更新します。後からサーバーが追加のスコープを要求した場合、Pi は再度サインインを求めます。サインアウトすると、保存されている認証情報が削除されます。

認証情報は、サーバー名と URL の組み合わせに属します。アカウントごとに 1 つずつ設定する場合など、同じ URL を異なる名前で使用するサーバーには個別にサインインします。異なる `mcp.json` ファイルにある同じ名前と URL のサーバーは、1 つのサインインを共有します。

OAuth は、`Authorization` ヘッダーのない HTTP サーバーに適用されます。動的クライアント登録をサポートしないサーバーでは、登録済みクライアントを設定します。

```json
{
  "mcpServers": {
    "example": {
      "url": "https://mcp.example.com/mcp",
      "oauth": { "clientId": "my-client", "clientSecret": "${EXAMPLE_SECRET}", "callbackPort": 8765 }
    }
  }
}
```

リダイレクト URI は、登録済みの URI と一致する必要があります。`callbackPort` は `http://127.0.0.1:<port>/callback` を使用します。別の URI を使用するには、`callbackUrl` を設定します。この URI は、`localhost`、`127.0.0.1`、`[::1]` のいずれかで HTTP を使用する必要があります。Pi は記述されたとおりに送信します。`callbackUrl` でポートを省略した場合、Pi は `callbackPort` または空いているポートを使用し、RFC 8252 でループバックリダイレクトに対して許可されているとおり、そのポートを URI に追加します。`clientSecret` は省略可能で、環境変数またはコマンドを使用できます。

必要なスコープを通知しないサーバーでは、`scope` にスペース区切りのリストを設定します。それ以外の場合、Pi は通知されたスコープを要求します。後から要求されたスコープは、設定済みの値に追加されます。

Pi は `pi` として登録します。一部のサーバーは、既知のクライアントからの登録のみを受け付けます。別の名前を送信するには、`clientName` を設定します。

```json
{
  "mcpServers": {
    "figma": { "url": "https://mcp.figma.com/mcp", "oauth": { "clientName": "Claude Code" } }
  }
}
```

この名前は、Pi がクライアントを登録するときにのみ送信されます。新しい名前で再登録するには、先にサインアウトしてください。

Pi は、サーバーの保護対象リソースメタデータ（RFC 9728）から認可サーバーを検出し、その認可サーバーのメタデータに想定される発行者が記載されていることを確認します（RFC 8414）。一部のサーバーは、誤った認可サーバーを通知するか、まったく通知しないため、サインイン時に存在しないページが開かれます。`authServerMetadataUrl` に正しい認可サーバーのメタデータ文書を設定します。

```json
{
  "mcpServers": {
    "example": {
      "url": "https://mcp.example.com/mcp",
      "oauth": { "authServerMetadataUrl": "https://example.okta.com/.well-known/openid-configuration" }
    }
  }
}
```

Pi は検出の代わりにその文書を使用し、設定されたものとして信頼します。そのため、信頼できる文書のみを指定してください。`localhost`、`127.0.0.1`、`[::1]` を除き、URL は HTTPS を使用する必要があります。

## ツールの公開範囲を制御する

各サーバーツールは `mcp__<server>__<tool>` として登録されます。サーバーの `exposure` によって、モデルがツールにアクセスする方法が決まります。

| 公開範囲 | 動作 | 一般的な用途 |
|---|---|---|
| `codemode`（デフォルト） | [`codemode`](cli.md#tools) スクリプトから呼び出せますが、モデルには宣言されず、codemode の説明にも掲載されません。スクリプトは `searchTools()`、`describeTool()`、`ALL_TOOLS` でツールを検索します。 | 一般的な MCP サーバー。特に、スクリプトで呼び出しを組み合わせたり絞り込んだりする場合。 |
| `deferred` | [`tool_search`](cli.md#tools) が次回のモデル呼び出し用に一致するツールを読み込むまで、宣言されません。 | 検出後にツールを直接呼び出す必要がある大規模なサーバー。 |
| `direct` | 組み込みツールと同様にモデルへ宣言され、codemode からも呼び出せます。 | 小規模で頻繁に使用するツールセット。 |
| `hidden` | 登録されますが、アクセスできません。 | 利用できない状態にしておく必要があるサーバーまたはツール。 |

`codemode-deferred` は `codemode` の別名として受け付けられます。

`codemode` または `deferred` のツールを持つサーバーは、システムプロンプトの `mcp_servers` セクションに、ツールへのアクセス方法と、設定済みの `description`、または接続後はサーバーの指示から取得した 1 行とともに掲載されます。Pi はプロンプトの開始時に、`direct` ツールを持つサーバーを待機してから、このセクションを更新します。たとえば、サーバーが接続されてその概要を利用できるようになったためにセクションが変化した場合、Pi はツール宣言を変更する代わりに、新しいセクションを会話へ追加します。これにより、以前のメッセージはキャッシュされたままになります。`describeNamespace()` と `searchTools()` の `namespace` オプションには、`mcp__dev-radius`、`mcp__dev_radius`、`dev-radius`、`dev_radius` のいずれかを指定できます。

`codemode` の公開範囲を持つサーバーが接続すると、Pi は `codemode` を有効にします。`deferred` の公開範囲を持つサーバーでは、`tool_search` を有効にします。検索せずにモデルからツールが見えるようにするには、`toolExposure` で `direct` の公開範囲を指定します。

`toolExposure` は、個々のツールについてサーバーの公開範囲を上書きします。キーには、サーバーツールの正確な名前か、`*` が任意の文字に一致するパターンを指定します。正確な名前はパターンより優先されます。パターン間では、最初に一致したものが優先されます。`hidden` の公開範囲を持つサーバーでも、選択したツールだけを公開できます。

```json
{
  "mcpServers": {
    "github": {
      "url": "https://api.githubcopilot.com/mcp/",
      "exposure": "deferred",
      "toolExposure": {
        "search_code": "direct",
        "get_*": "codemode",
        "delete_*": "hidden"
      }
    }
  }
}
```

`pi mcp list` は、公開範囲がサーバーと異なるツールに印を付けます。`/mcp` のツールビューにも、実際に適用される公開範囲が表示されます。

`codemode` または `deferred` の公開範囲を持つツールには、どちらの間接的な仕組みからもアクセスできます。codemode スクリプトから呼び出すことができ、`tool_search` で読み込むこともできます。codemode の呼び出しはアクティブなツールセットに依存しないため、`/tree`、再開、フォークの後も利用できます。`tool_search` が読み込んだツールはトランスクリプトに記録され、その分岐で宣言されたままになります。

MCP サーバーがなくても `codemode` を有効にしておくには、[設定](settings.md#tools)に `"defaultTools": ["+codemode"]` を追加します。codemode の自動有効化を防ぐには、`mcpServers` と同じ階層に `"autoEnableCodemode": false` を設定します。プロジェクトの値は、ユーザーレベルの値を上書きします。`codemode` と `tool_search` のどちらも有効でなく、非 direct ツールを呼び出せない場合、Pi は一度だけ警告します。

20 KB を超えるテキスト結果は、中央部分が `…N chars truncated…` マーカー付近で削除された状態でモデルに渡されます。全文は、結果に記載された名前の一時ファイルへ保存されます。codemode スクリプトは完全な結果を受け取り、モデルに出力を返す前に縮約できます。

codemode スクリプトは、`content`、`structuredContent`、`isError` を含む完全な MCP `CallToolResult` を受け取ります。`isError` を持つ結果は、スクリプト内では正常に処理されますが、直接呼び出した場合はエラーとして報告されます。`image(result.content[0])` は画像ブロックを転送します。サーバーの指示は、どのツールの説明にも含まれません。スクリプトは `describeNamespace("mcp__<server>")` で指示を読み取ります。この関数はサーバーのツール名も返します。

## リソースを使用する

接続済みのサーバーが[リソース](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)を提供する場合、Pi は Codex と OpenCode で使用されるリソースツールを追加します。

- `list_mcp_resources` は、リソースを JSON として一覧表示します：`{ server?, resources: [{ server, uri, name, ... }], nextCursor? }`。`server` を指定すると 1 ページを一覧表示し、`cursor` で次のページへ続きます。`server` を指定しない場合、すべてのサーバーのすべてのリソースを一覧表示します。
- `list_mcp_resource_templates` は、サーバーが直接一覧表示しないリソースの URI テンプレートを一覧表示します。
- `read_mcp_resource` は、`server` と `uri` でリソースを読み取ります。テキストはテキストとして、画像は画像としてモデルに渡されます。その他のバイナリリソースは一時ファイルに保存され、そのパスがモデルに渡されます。スクリプトは `{ server, uri, contents }` を受け取ります。

これらのツールは、リソースを持つ、有効かつ非表示でないすべてのサーバーにアクセスします。これらの公開範囲は、対象サーバーのうち最も広い公開範囲になります。`direct` が最優先で、次に `codemode` または `deferred` です。ツール結果内のリソースリンクは、`read_mcp_resource` とサーバーを識別します。

`ui://` URI または `text/html;profile=mcp-app` で識別される MCP Apps 用のリソースは、Pi がレンダリングしないため省略されます。リソースアイコンも省略されます。

リソースの読み取りと一覧表示は、一時的な HTTP エラー（408、429、5xx）の後に 1 回再試行されます。サーバーがすでにツール呼び出しを実行済みの可能性があるため、ツール呼び出しは再試行されません。

## 権限

すべての MCP 呼び出しは、Pi のツールパイプラインを通過します。そのため、権限ゲートを含む拡張機能の `tool_call` ハンドラーと `tool_result` ハンドラーは、MCP ツールにも適用されます。codemode スクリプトから行われた呼び出しでは、codemode の呼び出し ID が `parentToolCallId` として設定されます。

`pi.getAllTools()` は、各サーバーが宣言した `readOnlyHint`、`destructiveHint`、`idempotentHint`、`openWorldHint` の各アノテーションを報告します。権限拡張機能は、これらのヒントを使用して、どの呼び出しに確認が必要かを判断できます（[ツールの公開範囲](extensions.md#tool-exposure)を参照）。リソースツールは読み取り専用としてマークされます。

## 拡張機能と SDK

### 拡張機能からサーバーを追加する

拡張機能は、`mcpServers` エントリと同じ形式を使用して、`pi.registerMcpServer(name, config)` で現在のセッションにサーバーを追加できます（[拡張機能内の MCP サーバー](extensions.md#mcp-servers)を参照）。登録されたサーバーは、設定済みサーバーと同様に接続され、`/mcp` には拡張機能を設定元として表示されます。

有効状態や公開範囲の変更は、現在のセッションにのみ適用されます。同じ名前のファイル設定済みサーバーが優先され、`/mcp` には上書きされた登録が表示されます。`pi mcp` シェルコマンドは拡張機能を読み込まず、ファイルで設定されたサーバーのみを認識します。

### 組み込みの MCP サポートを置き換える

`pi-mcp-adapter` など、`/mcp` を登録するインストール済みの拡張機能は、セッションの組み込み MCP サポートを置き換えます。その場合、Pi はセッション内で `mcp.json` を読み取らず、そのサーバーにも接続しません。また、`/mcp` は拡張機能によって提供されます。組み込みの動作を復元するには、その拡張機能を削除します。代替なしで組み込み MCP サポートを無効にするには、`pi config` の Built-in で `mcp` を無効にするか、[設定](settings.md#resources)で `"extensions": ["-builtin:mcp"]` を設定します。

`codemode` または `tool_search` を登録する拡張機能も、同様に同名の組み込みツールを置き換えます。シェルレベルの `pi mcp` コマンドは、常に組み込み実装を使用します。

### SDK から MCP を使用する

SDK セッションは組み込み拡張機能を読み込みません。MCP 拡張機能、`codemode` サーバー用の codemode 拡張機能、および `deferred` サーバー用のツール検索拡張機能をリソースローダーに追加します。[Codemode と MCP](sdk.md#codemode-mcp) を参照してください。
