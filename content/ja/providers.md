# プロバイダー認証

ほとんどのホスト型プロバイダーは、次の認証方法の一方または両方をサポートしています。

- OAuthを使用したブラウザーまたはデバイスフローでサインインします。
- APIキーを指定します。

プロバイダーがサポートする方法を確認するには、`/login [provider]`を使用します。Amazon BedrockとGoogle Vertex AIでは、環境から取得できるクラウド認証情報も使用できます。

## 対話形式で認証する

`/login`を実行してプロバイダーを選択します。PiがOAuthまたはAPIキーフローを案内し、取得した認証情報を[`auth.json`](configuration.md#agent-directory)に保存します。

リモートマシンまたはヘッドレスマシンでは、OAuthコールバックがローカルプロセスに到達しない場合があります。プロンプトが表示されたら、最終的なリダイレクトURLまたは認証コードをPiに貼り付けます。

`/logout`を実行してプロバイダーを選択すると、保存されているそのプロバイダーの認証情報が削除されます。環境変数の設定解除、`models.json`からの認証情報の削除、プロバイダー側での認証情報の取り消しは行われません。

`auth.json`にはAPIキーやOAuthトークンが含まれる場合があります。非公開にし、コミットしないでください。

Radius認証ではゲートウェイカタログを使用し、更新されたモデルメタデータをキャッシュして、後でオフライン起動時に使用します。`models.json`で設定されたカスタムRadiusゲートウェイは、公開`radius.pi.dev`カタログを継承せず、独自のカタログを使用します。

## 環境のAPIキーを使用する

環境変数は、CIや、Piにキーを保存させたくない場合に便利です。Piを起動する前に変数を設定します。

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pi
```

次の表は、主要なAPIキー変数が1つだけのプロバイダーを示しています。追加設定が必要なプロバイダーや、環境から取得できる認証情報をサポートするプロバイダーについては、[クラウドプロバイダー](#cloud-providers)で説明します。

| プロバイダー | 環境変数 |
|---|---|
| Anthropic | `ANTHROPIC_API_KEY` |
| Ant Ling | `ANT_LING_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| NVIDIA NIM | `NVIDIA_API_KEY` |
| Google Gemini | `GEMINI_API_KEY` |
| GitHub Copilot | `COPILOT_GITHUB_TOKEN` |
| Mistral | `MISTRAL_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Cerebras | `CEREBRAS_API_KEY` |
| xAI | `XAI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Vercel AI Gateway | `AI_GATEWAY_API_KEY` |
| ZAI Coding Plan（グローバル） | `ZAI_API_KEY` |
| ZAI Coding Plan（中国） | `ZAI_CODING_CN_API_KEY` |
| OpenCode ZenおよびGo | `OPENCODE_API_KEY` |
| Radius | `RADIUS_API_KEY` |
| TypeSafe（[分類モデル](models.md#use-classifier-models)） | `TYPESAFE_API_KEY` |
| Hugging Face | `HF_TOKEN` |
| Fireworks | `FIREWORKS_API_KEY` |
| Together AI | `TOGETHER_API_KEY` |
| Baseten | `BASETEN_API_KEY` |
| Kimi For Coding | `KIMI_API_KEY` |
| Meta | `META_API_KEY` |
| MiniMax | `MINIMAX_API_KEY` |
| MiniMax（中国） | `MINIMAX_CN_API_KEY` |
| Moonshot AI（グローバルおよび中国） | `MOONSHOT_API_KEY` |
| Qwen Token PlanおよびIndividual | `QWEN_TOKEN_PLAN_API_KEY` |
| Qwen Token Plan（中国） | `QWEN_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo | `XIAOMI_API_KEY` |
| Xiaomi MiMo Token Plan（中国） | `XIAOMI_TOKEN_PLAN_CN_API_KEY` |
| Xiaomi MiMo Token Plan（アムステルダム） | `XIAOMI_TOKEN_PLAN_AMS_API_KEY` |
| Xiaomi MiMo Token Plan（シンガポール） | `XIAOMI_TOKEN_PLAN_SGP_API_KEY` |

Anthropicでは、`ANTHROPIC_OAUTH_TOKEN`もAPI認証情報として、`ANTHROPIC_AUTH_TOKEN`もBearer認証として認識されます。

キーもトークンも設定されていない場合、`ANTHROPIC_FEDERATION_RULE_ID`、`ANTHROPIC_ORGANIZATION_ID`、`ANTHROPIC_IDENTITY_TOKEN_FILE`が設定されていると、AnthropicはワークロードIDフェデレーションを使用します。Anthropic SDKはIDトークンを短期間有効なアクセストークンと交換し、それ自体で更新します（IDトークンファイルを再読み込みするため、長時間のセッションではそのファイルを最新に保ってください）。`ANTHROPIC_SERVICE_ACCOUNT_ID`と`ANTHROPIC_WORKSPACE_ID`が設定されている場合は、そのまま渡されます。

## コマンドからAPIキーを読み込む

解決済みのキーをディスクに書き込まずにシークレットマネージャーを使用するには、`auth.json`内のプロバイダーの`key`に、`!`を先頭に付けたコマンドを設定します。

```json
{
  "anthropic": {
    "type": "api_key",
    "key": "!security find-generic-password -ws 'anthropic'"
  }
}
```

Piは、キーが初めて必要になったときにコマンドを実行し、その標準出力をプロセスの存続期間中キャッシュします。出力が空の場合、タイムアウトした場合、または終了コードが0以外の場合、Piを再起動するまでキーは未解決のままです。

## クラウドプロバイダー

以下のプロバイダーでは、追加設定が必要であるか、クラウドプラットフォームから提供される認証情報を使用できます。

保存されたAPIキー認証情報には、`env`オブジェクトを含めることができます。その値は、そのプロバイダーについてプロセス環境より優先されます。

```json
{
  "cloudflare-workers-ai": {
    "type": "api_key",
    "key": "...",
    "env": {
      "CLOUDFLARE_ACCOUNT_ID": "account-id"
    }
  }
}
```

### Azure OpenAI

APIキーに加えて、ベースURLまたはリソース名のいずれかを設定します。

```bash
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_BASE_URL=https://your-resource.ai.azure.com
# Or:
export AZURE_OPENAI_RESOURCE_NAME=your-resource
```

`ai.azure.com`、`cognitiveservices.azure.com`、`openai.azure.com`配下のリソースルートURLは、OpenAI APIのパスに正規化されます。

### Amazon Bedrock

Bedrockでは、Bearerトークンまたは環境から取得できるAWS認証情報ソースを使用できます。

```bash
# Named profile
export AWS_PROFILE=your-profile

# IAM keys
export AWS_ACCESS_KEY_ID=AKIA...
export AWS_SECRET_ACCESS_KEY=...
# Required for temporary credentials
export AWS_SESSION_TOKEN=...

# Bedrock bearer token
export AWS_BEARER_TOKEN_BEDROCK=...

# Region, when not supplied by the profile or AWS SDK configuration
export AWS_REGION=us-west-2
# AWS_DEFAULT_REGION is also supported
```

Piは、標準の`AWS_CONTAINER_CREDENTIALS_*`変数と`AWS_WEB_IDENTITY_TOKEN_FILE`変数を介したECSタスク認証情報およびIRSAもサポートしています。

### Cloudflare AI Gateway

ゲートウェイには、トークン、アカウントID、ゲートウェイIDが必要です。

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
export CLOUDFLARE_GATEWAY_ID=...
```

アカウントIDとゲートウェイIDは、プロセス環境または`auth.json`内の認証情報の`env`オブジェクトから取得できます。

`CLOUDFLARE_API_KEY`は、Piをゲートウェイに対して認証します。アップストリームへのアクセスには、Cloudflareの統合請求、ゲートウェイに保存された認証情報、または`models.json`でプロバイダーに設定された`Authorization`ヘッダーを使用できます。

### Cloudflare Workers AI

Workers AIには、トークンとアカウントIDが必要です。

```bash
export CLOUDFLARE_API_KEY=...
export CLOUDFLARE_ACCOUNT_ID=...
```

アカウントIDは、認証情報の`env`オブジェクトに保存することもできます。

### Google Vertex AI

Google Cloud APIキーを使用します。

```bash
export GOOGLE_CLOUD_API_KEY=...
```

Application Default Credentialsを使用するには、プロジェクトとロケーションを設定します。

```bash
export GOOGLE_CLOUD_PROJECT=your-project
# GCLOUD_PROJECT is also supported
export GOOGLE_CLOUD_LOCATION=us-central1
```

次に、認証します。

```bash
gcloud auth application-default login
```

代わりにサービスアカウントのキーファイルを使用するには、プロジェクトおよびロケーションとともに`GOOGLE_APPLICATION_CREDENTIALS`を設定します。
