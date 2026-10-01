# クイックスタート

Pi はターミナル上で動作し、マシン上のファイルを扱います。使用するには、対応しているプロバイダーを通じてモデルにアクセスできる必要があります。サブスクリプション、API キー、またはローカルモデルを利用できます。

Windows ネイティブ環境でのセットアップについては、[Windows のセットアップ](windows.md)を参照してください。Android については、[Termux のセットアップ](termux.md)を参照してください。

## 1. Pi をインストールする

macOS または Linux では、インストーラーを使用できます。

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

または、npm から Pi をインストールします。これには Node.js 22.19 以降が必要です。

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

通常の npm インストールでは、Pi に依存関係のライフサイクルスクリプトは必要ありません。

インストールを確認します。

```bash
pi --version
```

## 2. Pi を起動する

Pi で作業するフォルダーに移動してから、Pi を起動します。

```bash
cd /path/to/folder
pi
```

作業フォルダーは、Pi が関連するファイル、指示、設定を見つけるために役立ちます。また、Pi は保存したセッションを作業フォルダーごとにまとめます。

<p align="center"><img src="images/interactive-mode.png" alt="Pi running in a terminal with a conversation, input editor, and status footer" width="750"></p>

インターフェースには、会話、プロンプトやコマンドを入力するエディター、現在のフォルダー、モデル、セッションの状態を示すフッターが表示されます。ファイルの追加、コマンドの実行、進行中の作業への指示、結果の管理については、[ターミナルで Pi を使用する](usage.md)を参照してください。

## 3. モデルを選択する

**モデル**は Pi の応答を生成します。**プロバイダー**は、Pi がそのモデルにアクセスするために使用するサービスまたはアカウントです。

Pi で次を実行します。

```text
/login
```

プロバイダーを選択し、表示される案内に従ってサブスクリプションを使用するか、API キーを保存します。その後、利用可能な別のモデルを選択する場合は `/model` を実行します。

対応しているプロバイダー、環境変数による認証、ローカルモデル、カスタムエンドポイントについては、[モデルとプロバイダーを選択する](models.md)を参照してください。

## 4. Pi にタスクを与える

Pi は、読み取った各ファイル、検索、コマンド、編集を表示します。ツールを呼び出すたびに確認を求めることはありません。

作業内容に合ったタスクを入力します。例：

```text
Summarize @meeting-notes.md and save the action items to action-items.md.
```

```text
Explain how this repository is structured and how to run its checks.
```

```text
Compare @previous.csv with @current.csv and summarize the important changes.
```

ファイルのフルパスを入力する代わりに、エディターで `@` を入力してファイルを検索します。Pi の処理が完了したら、応答と変更されたファイルを確認します。重要な作業には、バージョン管理またはバックアップを使用してください。信頼できない作業や無人で実行する作業には、コンテナまたは別のサンドボックスを使用してください。[セキュリティ](security.md)を参照してください。

## 後で続行する

Pi はセッションを自動的に保存します。Pi を終了した後、同じ作業フォルダーの最新セッションを次の方法で再開します。

```bash
pi --continue
```

別の保存済みセッションを選択するには、`/resume` を使用します。セッションの命名、分岐、圧縮、エクスポート、共有については、[セッションを続行または分岐する](sessions.md)を参照してください。

## 次のステップ

- 入力、コマンド、ショートカット、キューに追加されたメッセージについては、[Pi を対話的に使用する](usage.md)を参照してください。
- Pi がフォルダー内で作業する際に常に従う[指示を追加する](configuration.md#context-files)。
- [モデルとプロバイダーを選択する](models.md)。

### Pi のカスタマイズ方法を選択する

要件を満たす最も機能の少ない仕組みから始めます。

| 必要なこと | 最初に使用するもの |
|---|---|
| フォルダーに対する永続的な指示を Pi に与える | [`AGENTS.md`](configuration.md#context-files) |
| `/` メニューからプロンプトを再利用する | [プロンプトテンプレート](prompt-templates.md) |
| タスク固有の指示と補助ファイルを追加する | [スキル](skills.md) |
| 実行可能なツール、コマンド、イベントハンドラーを追加する | [拡張機能](extensions.md) |
| カスタムのターミナルコンポーネントを構築する | [ターミナル UI](tui.md) |
| 未対応のモデルサービスに接続する | [カスタムプロバイダー](custom-provider.md) |
| 複数のリソースをインストールまたは配布する | [Pi パッケージ](packages.md) |

## Pi をアンインストールする

npm で Pi をインストールした場合は、次を実行します。

```bash
npm uninstall -g @earendil-works/pi-coding-agent
```

インストーラーを使用した場合は、もう一度実行して **Pi をアンインストール** を選択します。

```bash
curl -fsSL https://pi.dev/install.sh | sh
```

どちらの方法でも、`~/.pi/agent/` にある設定、認証情報、セッション、インストール済みの Pi パッケージは削除されません。
