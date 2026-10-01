# Pi を隔離環境で実行する

隔離環境を使用して、生成されたコマンドがアクセスまたは影響できるファイル、認証情報、プロセス、ネットワークサービスを制限します。

Pi プロセス全体を隔離することも、Pi をホスト上で実行したまま、選択したツールを隔離環境にルーティングすることもできます。

## 隔離方法を選択する

| 方法 | Pi の実行場所 | 隔離されるもの | 認証情報の処理 | 適した用途 |
|---|---|---|---|---|
| 通常の Docker | コンテナ | Pi、組み込みツール、`!` コマンド、拡張機能 | コンテナに渡される認証情報 | シンプルなローカルコンテナ境界 |
| Docker Sandboxes | 管理対象サンドボックス | Pi、組み込みツール、`!` コマンド、拡張機能 | プロバイダーの認証情報はホストに保持され、プロキシによって置換される | 実際のプロバイダーキーを公開しない管理対象のローカル隔離 |
| OpenShell | ローカルまたはリモートのサンドボックス | Pi、組み込みツール、`!` コマンド、拡張機能 | ポリシーによって制御される認証情報と推論ルーティング | ファイルシステム、プロセス、ネットワーク、認証情報のポリシー |
| Gondolin 拡張機能 | ホスト | 組み込みツールと `!` コマンド | 保存された Pi の認証情報はホストに保持されるが、コマンドはホストの環境変数を継承する | ホストインターフェースを維持しながらツールを実行するローカルマイクロ VM |

選択する方法によって、拡張機能の実行場所が変わります。Pi プロセス全体が隔離環境内で実行される場合、その拡張機能も同じ環境内で実行されます。ホスト上の Pi が Gondolin を介して組み込みツールを委譲する場合、その他の拡張機能のツールは、それ自体も処理を委譲しない限り、引き続きホスト上で実行されます。

## Pi がアクセスできる対象を決定する

隔離されたプロセスでも、公開したリソースには影響を与える可能性があります。

- 読み書き可能なホストマウントを使用すると、Pi はそれらのホストファイルを変更できます。
- `~/.pi/agent` をマウントすると、Pi の認証情報、設定、拡張機能、セッションが公開されます。
- コンテナに渡した環境変数は、その内部のプロセスから利用できます。
- ネットワークアクセスがあると、コードやツールの出力が環境外に送信される可能性があります。
- ツールのみの隔離では、ホスト上の Pi プロセスや、隔離されたバックエンドを使用しない拡張機能のツールは制限されません。

タスクに必要な作業フォルダー、認証情報、ネットワーク接続先だけを公開してください。書き込みによってホストに影響を与えたくない場合は、読み取り専用マウントを使用するか、環境との間でファイルをコピーしてください。

## 通常の Docker で Pi を実行する

通常の Docker は、プロセス全体に対する最もシンプルなコンテナ境界を提供します。

### イメージをビルドする

`Dockerfile.pi` を作成します。

```dockerfile
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends bash ca-certificates git ripgrep \
  && rm -rf /var/lib/apt/lists/*
RUN npm install -g --ignore-scripts @earendil-works/pi-coding-agent

WORKDIR /workspace
ENTRYPOINT ["pi"]
```

そのファイルがあるディレクトリからビルドします。

```bash
docker build -t pi-sandbox -f Dockerfile.pi .
```

### Pi を起動する

Pi にアクセスさせる作業フォルダーから、次を実行します。

```bash
docker run --rm -it \
  -e ANTHROPIC_API_KEY \
  -v "$PWD:/workspace" \
  -v pi-agent-home:/root/.pi/agent \
  pi-sandbox
```

`ANTHROPIC_API_KEY` を、プロバイダーで必要な認証情報に置き換えます。`pi-agent-home` という名前のボリュームには、コンテナローカルの設定、認証情報、セッションが実行間で保持されます。

コンテナにホストの Pi 設定と認証情報へのアクセスを許可する場合を除き、ホストの `~/.pi/agent` をマウントしないでください。

### ワークスペースを確認する

Pi 内で次を実行します。

```text
!pwd
```

このコマンドでは `/workspace` と表示されるはずです。`/workspace` 配下の変更は、マウントされたホストフォルダーに反映されます。それが許容できない場合は、バインドマウントを削除するか、読み取り専用マウントを使用してください。

## Docker Sandboxes で Pi を実行する

[Docker Sandboxes](https://docs.docker.com/ai/sandboxes/) は、Pi プロセス全体を管理対象サンドボックス内で実行します。そのプロキシは、実際のプロバイダー認証情報をホストに保持し、リクエストがサンドボックスから送信される際に置換できます。

サンドボックスを作成する前に認証情報を設定してください。サンドボックス内に実際の認証情報が書き込まれるため、サンドボックス内で `/login` を実行しないでください。

### Claude Pro または Max トークンを使用する

Claude Code があるマシンで `claude setup-token` を使用してトークンを生成します。`anthropic` シークレットがすでに設定されている場合は、プロキシがベアラートークンと併せて API キーヘッダーを追加しないように、先に削除してください。

```bash
sbx secret rm anthropic

sbx secret set-custom \
  --host api.anthropic.com \
  --env ANTHROPIC_OAUTH_TOKEN \
  --placeholder 'sk-ant-oat01-{rand}'
```

`sbx secret set-custom` は、標準入力から実際のトークンを読み取ります。サンドボックスには OAuth 形式のプレースホルダーが渡され、プロキシは設定されたホストへのリクエストに対してのみそれを置換します。

Anthropic API キーの場合は、代わりに `sbx secret set anthropic` を使用します。

### Pi を起動する

マウントする作業フォルダーから、次を実行します。

```bash
sbx run --kit "docker.io/sbx/pi-kit:latest" pi
```

既存のサンドボックスでは、次のコマンドを使用して Pi を非対話的に実行します。

```bash
sbx exec <sandbox-name> -- pi -p "list the failing tests"
```

その他のプロバイダー、トラブルシューティング、イメージの固定については、[Pi kit のドキュメント](https://github.com/docker/sbx-kits-contrib/tree/main/pi)を参照してください。

## OpenShell で Pi を実行する

[NVIDIA OpenShell](https://docs.nvidia.com/openshell/about/overview) は、ファイルシステム、プロセス、ネットワーク、認証情報、推論に関するポリシーを備えたローカルまたはリモートのサンドボックスを提供します。

### ゲートウェイを選択する

すべてのサンドボックスには、アクティブなゲートウェイが必要です。

```bash
openshell gateway add <gateway-url> --name <name>
openshell gateway select <name>
```

### サンドボックスを作成する

```bash
openshell sandbox create --name pi-sandbox --from pi -- pi
```

Pi、その組み込みツール、`!` コマンド、拡張機能のツールは、OpenShell の境界内で実行されます。

### リモートサンドボックスにファイルを転送する

リモートゲートウェイでは、ホストの作業フォルダーはバインドマウントされません。サンドボックス内でリポジトリをクローンするか、ファイルを明示的に転送してください。

```bash
openshell sandbox upload pi-sandbox ./working-folder /workspace
openshell sandbox download pi-sandbox /workspace/working-folder ./working-folder-out
```

OpenShell の推論ルーティングを使用すると、生のモデル認証情報をサンドボックス外に保持できます。設定した場合は、ゲートウェイが公開する対応する OpenAI 互換または Anthropic 互換のエンドポイントを Pi に指定してください。

## Gondolin を介してツールをルーティングする

[Gondolin](https://github.com/earendil-works/gondolin) は、ローカルの Linux マイクロ VM です。その拡張機能の例では、Pi プロセスとファイルベースのプロバイダー認証情報をホストに保持しながら、組み込みツールとユーザーの `!` コマンドを VM 内にルーティングします。

VM 内のコマンドは、ホストプロセスの環境を継承します。そのため、環境変数で渡されたプロバイダーキーは VM 内から参照できる可能性があります。機密性の高い変数を削除するか、拡張機能の環境処理を変更しない限り、この方式を認証情報の境界として使用しないでください。

Gondolin には Node.js 23.6 以降と、オペレーティングシステムのパッケージマネージャーを介してインストールした QEMU が必要です。

### 拡張機能をインストールする

Pi のソースチェックアウトから、次を実行します。

```bash
mkdir -p ~/.pi/agent/extensions
cp -R packages/coding-agent/examples/extensions/gondolin ~/.pi/agent/extensions/gondolin
cd ~/.pi/agent/extensions/gondolin
npm install --ignore-scripts
```

### Pi を起動する

マウントする作業フォルダーから Pi を実行します。

```bash
cd /path/to/working-folder
pi -e ~/.pi/agent/extensions/gondolin
```

この拡張機能は、ホストの作業フォルダーを VM 内の `/workspace` にマウントし、`read`、`write`、`edit`、`bash`、`grep`、`find`、`ls` をオーバーライドします。`/workspace` 配下でのファイル変更はホストに反映されます。

その他の拡張機能のツールは、明示的に処理を委譲しない限り、引き続きホスト上で実行されます。VM の境界を迂回する可能性があるツールを追加する前に、[Gondolin の例](../examples/extensions/gondolin/)を確認してください。
