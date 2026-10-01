# モデルを選択する

組み込みプロバイダーの場合は、まず `/login` を実行し、次に `/model` でモデルを選択します。Pi に必要なプロバイダーまたはエンドポイントがまだ含まれていない場合にのみ、カスタムモデル設定を使用してください。

## 接続方法を選択する

| 用意されているもの | 推奨設定 |
|---|---|
| サポート対象のサブスクリプション | `/login` からサインインする |
| プロバイダーの API キー | `/login` から保存するか、その環境変数を設定する |
| ローカルの GGUF モデル | Pi を llama.cpp ルーターに接続する |
| OpenAI、Anthropic、または Google と互換性のあるエンドポイント | `models.json` に追加する |
| カスタムプロトコルまたは認証フローを使用するプロバイダー | プロバイダー拡張機能を作成またはインストールする |

現在のプロバイダー、モデル ID、機能、コンテキスト上限、料金については、[モデルカタログ](https://pi.dev/models)を参照してください。Pi は同梱のカタログで起動し、pi.dev から取得した新しいカタログデータを重ねて適用できます。キャッシュ済みのカタログデータはオフラインでも引き続き利用できます。強制的に更新するには `pi update --models` を実行してください。

## 認証する

`/login` を実行し、プロバイダーを選択します。Pi は認証情報を [`auth.json`](configuration.md#agent-directory) に保存します。プロバイダーについて保存済みの認証情報を削除するには、`/logout` を実行します。

代わりに、プロバイダーの環境変数を通じて API キーを指定できます。これは、Pi が認証情報を書き込むべきではない CI などの環境で便利です。[プロバイダー認証](providers.md)には、環境変数とクラウドプロバイダーの設定が記載されています。

複数の認証情報ソースが設定されている場合、Pi は最初に実行時の `--api-key`、次に保存済みの `auth.json` 認証情報、`models.json` の `apiKey`、最後にプロバイダーの環境変数または環境内のクラウド認証情報を使用します。プロバイダー拡張機能では、独自の認証動作を定義できます。

`auth.json` と認証情報を扱うすべてのコマンドは非公開にしてください。プロジェクトを信頼すると、プロジェクト設定と拡張機能が Pi プロセス内で実行される可能性があります。信頼できないディレクトリから設定を読み込む前に、[セキュリティ](security.md)を確認してください。

## モデルを選択する

利用可能なモデルを検索するには、`/model` を実行します。選択画面には、使用可能な認証情報があるプロバイダーのモデルが表示されます。モデル上で `Ctrl+S` を押すと、新しいセッションのデフォルトとして保存されます。

現在のモデルの思考レベルを選択するには、`/thinking` を実行します。そこで `Ctrl+S` を押すと、起動時のレベルとして保存されます。Pi では、選択したモデルがサポートするレベルのみを選択できます。

`Ctrl+P` を押すと、利用可能なモデルが順に切り替わります。この切り替えを制御して選択内容を保存するには `/scoped-models` を使用し、モデルパターンを設定するには[設定](settings.md#model-cycling)を使用します。

セッションには、モデルと思考レベルの変更が記録されます。セッションを再開すると、新しいセッションのデフォルトを変更せずに、それらが復元されます。

## ローカルモデルに接続する

Pi は llama.cpp ルーターと直接連携します。ルーターは GGUF ファイルを検出し、必要に応じてモデルを読み込みます。Pi の `/llama` コマンドでルーターを管理し、`/model` で読み込まれたモデルのいずれかを選択します。

サーバーの起動、モデルの配置、ダウンロード、接続に関するトラブルシューティングについては、[llama.cpp を使用したローカルモデル](llama-cpp.md)に従ってください。

Ollama、LM Studio、vLLM、SGLang、およびその他の互換サーバーについては、`models.json` で[互換エンドポイントを設定](#configure-a-compatible-endpoint)します。

## 互換エンドポイントを設定する

エンドポイントが Pi で既にサポートされている API を使用する場合は、[`models.json`](configuration.md#agent-directory) を使用します。これには、ほとんどの Ollama、LM Studio、vLLM、SGLang、およびプロキシのデプロイが含まれます。

```json
{
  "providers": {
    "ollama": {
      "baseUrl": "http://localhost:11434/v1",
      "api": "openai-completions",
      "apiKey": "ollama",
      "models": [
        { "id": "qwen2.5-coder:7b" }
      ]
    }
  }
}
```

ダミーキーにより、モデルが Pi で利用可能になります。Ollama はこのキーを無視します。認証が必要なエンドポイントでは、`apiKey` とヘッダー値に、`$NAME` または `${NAME}` 形式の環境変数展開、リテラル値、または先頭に `!command` を付けた値を使用できます。`models.json` 内のコマンドはリクエスト時に実行され、Pi ではキャッシュされません。

`/model` を開くと、ファイルが再読み込みされます。`models` エントリは、そのプロバイダー上で同じ ID を持つモデルを追加または置換します。プロバイダーのモデル一覧を置換せずに、既存の組み込みモデルまたは拡張機能が提供するモデルのメタデータを変更するには、`modelOverrides` を使用します。不明なオーバーライド ID は無視されます。

### モデルの入力とキャッシュを記述する

会話履歴に保存する前に、Pi が新しい画像添付ファイル、`read` の結果、およびツール結果の画像をエンコードする方法を制御するには、`inputLimits.images.resize` を使用します。

```json
{
  "id": "vision-model",
  "input": ["text", "image"],
  "inputLimits": {
    "images": {
      "resize": {
        "maxWidth": 1568,
        "maxHeight": 1568,
        "maxBytes": 524288,
        "jpegQuality": 75
      }
    }
  }
}
```

`maxBytes` は、base64 エンコードされたペイロードを制限します。省略されたリサイズフィールドには、2000 × 2000 ピクセル、エンコード後 4.5 MiB、JPEG 品質 80 という控えめなデフォルト値が使用されます。画像は一度だけエンコードされます。モデルを変更しても、履歴内の画像は再書き込みされません。カタログでは、`inputLimits.maxRequestBytes`、`images.maxPerMessage`、`images.maxPerRequest` を使用して厳格なリクエスト上限も記述できますが、Pi は現時点では、それらに基づいて履歴を書き換えたり拒否したりしません。

<a id="prompt-cache-lifetimes"></a>

`short` または `long` の保持階層について、プロバイダーのベストエフォートのキャッシュ有効期間を秒単位で宣言するには、`promptCache` を使用します。

```json
{ "id": "claude-sonnet-5", "promptCache": { "short": 300, "long": 3600 } }
```

公開されている範囲のうち、控えめな側の値を選択してください。アクティブな階層の有効期間が設定されていないモデルは、キャッシュウォーミングの対象になりません。`modelOverrides` エントリでは、検証済みプロキシを介してアクセスするモデルを含め、組み込みモデルまたは拡張機能のモデルに `inputLimits` または `promptCache` を設定できます。[`cacheWarming`](settings.md#model-and-thinking)を参照してください。

互換性設定には、エンドポイントのリクエストまたはレスポンスの動作について検証済みの相違点を記述する必要があります。エンドポイントが OpenAI または Anthropic との互換性をうたっているという理由だけで有効にしないでください。

## 分類器モデルを使用する

分類器モデルはチャットを行いません。JSON の状態に関する型付きの質問に回答します。複数の選択肢から 1 つを選ぶ、はいまたはいいえで答える、またはスコアを示すといった回答を、それぞれ確率付きで返します。Pi には、以下のプロバイダーが提供する TypeSafe の Jev モデルが含まれています。

| プロバイダー | モデル ID | 認証 |
|---|---|---|
| `typesafe` | `jev-latest` | `TYPESAFE_API_KEY` |
| `openrouter` | `typesafe/jev-1.13`、`~typesafe/jev-latest` | `OPENROUTER_API_KEY` または `/login` |
| `cloudflare-workers-ai` | `typesafe/jev` | `CLOUDFLARE_API_KEY` および `CLOUDFLARE_ACCOUNT_ID` |
| `vercel-ai-gateway` | `typesafe-ai/jev` | `AI_GATEWAY_API_KEY` |
| `opencode` | `jev-1.13`、`jev-1.13-free` | `OPENCODE_API_KEY` |

[llama.cpp ルーター](llama-cpp.md#classification)上のチャットモデルも、分類器モデルとして一覧表示されます。

分類器モデルは `/model` には表示されません。モデルは、MCP サーバーが有効にしない限り無効になっている [`codemode`](cli.md#enable-codemode) ツールを介して分類器モデルにアクセスします。[設定](settings.md#tools)で `"defaultTools": ["+codemode"]` を指定して有効にします。これにより、スクリプトは `models.getAvailableOfType("classifier")` で分類器モデルを一覧表示し、`models.classify(model, { state, questions })` を呼び出します。

```js
const jev = await models.getModelOfType("classifier", "typesafe", "jev-latest");
const result = await models.classify(jev, {
  state: { message: "The change works, thanks." },
  questions: {
    approved: {
      type: "bool",
      instructions: "Does the user approve of the result?",
      criteria: { true: "Approval", false: "No approval" },
    },
  },
});
return result.answers;
```

すべての System One サービスと同様に、サービスがトークン数を報告する場合、`result.usage` にはそのトークン数とコストが格納されます。Pi は、スクリプトによる分類器呼び出しの使用量を `codemode` ツールの結果に追加するため、フッターと `/session` に表示されるセッションコストに算入されます。コストにはモデルのカタログ価格が使用されます。TypeSafe が直接提供する `jev-latest` など、価格が設定されていないモデルでは、コストなしでトークン数が報告されます。

拡張機能は、codemode を使用せずに `ctx.modelRegistry.classify()` を介して分類器を呼び出します。[仮想モデル](virtual-models.md#route-requests)では、分類器を使用してリクエストを振り分けることができます。`jev-router.ts` の例を参照してください。

## カスタムプロバイダーを追加する

プロバイダーでカスタムストリーミング、モデル検出、または認証動作が必要な場合は、拡張機能を使用します。拡張機能のワークフローについては、[カスタムプロバイダー](custom-provider.md)を参照してください。

## トラブルシューティング

### モデルが表示されない

プロバイダーに使用可能な認証情報があることを確認してください。カスタムモデルは `models.json` から読み込めますが、Pi が認証情報を解決できるようになるまで `/model` では利用できません。llama.cpp の場合、ルーターが現在読み込んでいるモデルのみが表示されます。

### 1 つのシェルでしか認証が機能しない

キーが `auth.json` ではなく環境変数から取得されたものかどうかを確認してください。環境変数は、Pi を起動するプロセスに存在する必要があります。

### サインイン時にリモートマシン上でブラウザーが開く

利用可能な場合は、プロバイダーのヘッドレス認証フローを完了してください。一部のプロバイダーでは、最終的なリダイレクト URL または認証コードを Pi に貼り付けることができます。[対話形式で認証する](providers.md#authenticate-interactively)を参照してください。

### 互換エンドポイントがリクエストを拒否する

`models.json` で API の種類と互換性設定を確認してください。上流サーバーは、対応するリクエストフィールドと動作をサポートしている必要があります。
