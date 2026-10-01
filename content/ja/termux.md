# Termux で Android 上の Pi を実行する

Pi は、ターミナルエミュレーター兼 Linux 環境である [Termux](https://termux.dev/) を介して Android 上で動作します。テキスト入力、ファイルツール、シェルコマンドがサポートされています。Pi は Termux:API を使用して、Android のクリップボード経由でテキストをコピー＆ペーストできます。クリップボードからの画像の貼り付けはサポートされていません。

## 始める前に

Termux は [GitHub または F-Droid](https://github.com/termux/termux-app#installation) からインストールしてください。非推奨の Google Play ビルドは使用しないでください。

[Termux:API](https://github.com/termux/termux-api#installation) は任意です。Pi で Android のクリップボードのテキストをコピーまたは貼り付ける場合や、シェルコマンドで Android デバイスの API が必要な場合にのみインストールしてください。

## Pi をインストールする

1. Termux のパッケージを更新します。

   ```bash
   pkg update && pkg upgrade
   ```

2. Node.js と Git をインストールします。

   ```bash
   pkg install nodejs git
   ```

3. Pi をインストールします。

   ```bash
   npm install -g --ignore-scripts @earendil-works/pi-coding-agent
   ```

4. インストールを確認します。

   ```bash
   pi --version
   ```

5. 作業するフォルダーを開き、Pi を起動します。

   ```bash
   cd /path/to/working-folder
   pi
   ```

メインの[クイックスタート](quickstart.md#3-choose-a-model)に進み、モデルに接続して最初のタスクを実行してください。

## Android の共有ストレージにアクセスする

権限を付与するまで、Termux は Android の共有ストレージにアクセスできません。次の操作を一度実行してください。

```bash
termux-setup-storage
```

承認後、Android の共有ストレージは `/storage/emulated/0`、および Termux が `~/storage/` 配下に作成するリンクから利用できます。

Pi がそれらのファイルにアクセスできるようにする必要がある場合にのみ、この権限を付与してください。Termux で実行されるコマンドとツールには、Termux プロセスと同じストレージ権限が適用されます。

## クリップボードコマンドを使用する

Pi はテキストのコピーに `termux-clipboard-set` を使用し、クリップボード貼り付けショートカットには `termux-clipboard-get` を使用します。シェルコマンドから両方のコマンドを直接使用することもできます。Termux:API アプリとそのコマンドラインパッケージをインストールしてください。

```bash
pkg install termux-api
```

連携を確認します。

```bash
printf 'Pi clipboard test' | termux-clipboard-set
termux-clipboard-get
```

2 番目のコマンドで `Pi clipboard test` が出力されるはずです。

Termux のクリップボード API はテキストのみをサポートします。Pi のクリップボード貼り付けショートカットは、そのテキストをエディターに挿入できますが、クリップボードの画像を添付することはできません。

## Termux 固有の指示を追加する

Pi は Termux 内で実行されていることを検出しますが、Android とどのように連携させたいかを推測することはできません。作業に関連する環境の詳細だけを `~/.pi/agent/AGENTS.md` に追加してください。

````markdown
# Termux environment

- Pi runs in Termux on Android.
- Shared Android storage is under `/storage/emulated/0`.
- Open URLs with `termux-open-url "https://example.com"`.
- Open files with `termux-open <path>`.
- Do not access shared storage unless the task requires it.
````

アクティブなセッション中にファイルを変更した場合は、`/reload` を実行してください。

## トラブルシューティング

### クリップボード連携が失敗する

次の両方のコンポーネントがインストールされていることを確認してください。

1. Termux と同じ提供元から入手した Termux:API Android アプリ
2. `termux-api` コマンドラインパッケージ

次に、上記のクリップボード確認コマンドを Pi の外部で実行してください。そこで失敗する場合は、Pi のコピーコマンドを再試行する前に Termux:API のインストールを修正してください。

### 共有ストレージで権限拒否が報告される

`termux-setup-storage` を実行し、Android の権限リクエストを承認してから、`~/storage/` または `/storage/emulated/0` 配下のパスを再試行してください。

### インストール後に Pi が見つからない

新しい Termux シェルを開き、次を実行してください。

```bash
npm prefix -g
command -v pi
```

グローバル npm バイナリディレクトリが `PATH` に含まれていることを確認し、パッケージがない場合は Pi を再インストールしてください。
