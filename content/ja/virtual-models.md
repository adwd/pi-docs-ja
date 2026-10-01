# 仮想モデル

仮想モデルは、リクエストごとに物理モデルを選択する、選択可能なモデルです。タスク、コスト、または会話の状態に応じたルーティングに使用します。たとえば、ユーザーが単一のモデルを選択する一方で、ルーターは簡単な質問を小規模なモデルに、難しい問題を大規模なモデルに送信できます。

[拡張機能](extensions.md)から仮想モデルを登録します。仮想モデルは、他のモデルと同様に、`/model`、`--model`、スコープ付きモデル、および設定に表示されます。仮想モデルは、`openai-codex/auto`のように物理モデルを含むプロバイダーを含め、任意のプロバイダーの下に一覧表示できます。

## 選択とディスパッチ

仮想モデルでは、モデルと推論レベルを選択します。ルーターはリクエストごとに、その組み合わせを物理モデルと推論レベルの組み合わせに対応付けます。

```
selected (virtual model, virtual level)  ->  dispatched (physical model, physical level)
jev/auto:low                             ->  anthropic/claude-sonnet-4-5:high
```

仮想の推論レベルはルーターへの入力です。その意味はルーターによって決まり、推論予算に対応している必要はありません。

Pi は、この2つの組み合わせを分けて保持します。

| | 選択 | ディスパッチ |
|---|---|---|
| 記録先 | `model_change`および`thinking_level_change`のエントリ | 各アシスタントメッセージ：`provider`、`api`、`model`、`thinkingLevel` |
| 表示形式 | `ctx.model`、`ctx.thinkingLevel`、`PI_MODEL`、`PI_REASONING_LEVEL`、`/model` | 各レスポンスのアシスタントメッセージ |

プロバイダーが受け取るのは物理モデルだけです。アシスタントメッセージには物理モデルの名前が記録されるため、異なる物理モデルにまたがって会話を再生しても、手動でモデルを切り替えた後と同じように機能します。セッションを再開すると、最新の`model_change`エントリから仮想モデルの選択が復元されます。その仮想モデルが登録されていない場合、Pi は最後に応答した物理モデルにフォールバックします。

インタラクティブモードでは、フッターに、選択したモデルの横へルーティング先のモデルが表示されます（例：`auto • high → gpt-5.6-luna • medium`）。`/session`には、各物理モデルのコストが一覧表示されます。

コンテキスト使用量には、最新のレスポンスを生成した物理モデルの上限が使用されます。そのレスポンスが仮想モデルへの切り替え前に生成された場合も同様です。そのようなレスポンスがない場合は、仮想モデルに上限が宣言されていれば、その上限が使用されます。圧縮では同じ上限を確認し、さらに各リクエストのルーティング先モデルの上限も確認します。そのモデルのコンテキストウィンドウが会話に対して小さすぎる場合、Pi はリクエストを送信する前に圧縮します。ルーティング先はルーターが選択したまま変わりません。

## 仮想モデルを登録する

```typescript
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerVirtualModel({
    provider: "router",
    id: "auto",
    name: "Auto",
    thinkingLevels: ["low", "high"],
    route(request, ctx) {
      // Tool follow-ups and retries stay on the model that handled the turn.
      const sticky = request.failed ?? request.previous;
      if (request.reason !== "user" && sticky) {
        return { model: sticky.model, thinkingLevel: sticky.thinkingLevel ?? "medium" };
      }
      const id = request.thinkingLevel === "high" ? "claude-sonnet-4-5" : "claude-haiku-4-5";
      return { model: ctx.modelRegistry.find("anthropic", id)!, thinkingLevel: "medium" };
    },
  });
}
```

- `provider`は、モデルが一覧表示されるプロバイダーです。任意のプロバイダー ID を指定できます。プロバイダーでは、物理モデルと並べて複数の仮想モデルを一覧表示できます。物理プロバイダーの下では、そのプロバイダーの認証情報がある場合に仮想モデルを使用できます。どのプロバイダーも使用していない ID の下では、常に使用できます。
- `id`には、そのプロバイダーの物理モデルの ID を指定してはなりません。後のカタログ更新で同じ ID の物理モデルが追加された場合、仮想モデルによってその物理モデルが非表示になります。
- `thinkingLevels`には、選択肢として提供するレベルを列挙します。デフォルトは`["off"]`です。
- `contextWindow`と`maxTokens`は、最初のレスポンスの前に表示されます。未設定の上限は不明として扱われます。
- `input`には、選択肢として提供する入力タイプを列挙します。デフォルトはテキストと画像です。画像をサポートしない物理モデルにはプレースホルダーが渡されます。

登録には、`pi.registerProvider()`と同じキューイングおよび再読み込みの規則が適用されます。同じプロバイダーと ID を再度登録すると、仮想モデルが置き換えられます。`pi.unregisterVirtualModel(provider, id)`では削除されますが、`pi.unregisterProvider()`では削除されません。SDK コードでは、拡張機能を使わずに`modelRuntime.registerVirtualModel(definition)`で登録できます。

## リクエストをルーティングする

`route(request, ctx)`は、仮想モデルで行われるすべてのリクエストの前に実行され、`{ model, thinkingLevel }`を返します。モデルには、カタログ内にあり、そのプロバイダーの認証情報が存在する任意の物理モデルを指定できます。`ctx.modelRegistry`で検索します。仮想モデルから別の仮想モデルへルーティングすることはできません。Pi は、返されたモデルで使用可能な範囲に推論レベルを制限します。

| フィールド | 意味 |
|---|---|
| `model`、`thinkingLevel` | 選択された仮想モデルとレベル |
| `reason` | リクエストが行われる理由（後述） |
| `previous` | `messages`内の最新の成功したレスポンスの物理モデルと推論レベル |
| `failed` | `retry`の場合：失敗したリクエストの物理モデル、推論レベル、およびアシスタントの`message`。このアシスタントメッセージは`messages`には含まれなくなります。このメッセージには`stopReason`と`errorMessage`が含まれます。ルーティング自体が失敗した場合は存在しません |
| `state` | このセッション分岐でルーターが最後に返した状態（後述） |
| `messages` | システムメッセージを含む、このリクエストの会話 |
| `signal` | リクエストの中止シグナル |

| `reason` | リクエスト |
|---|---|
| `user` | ステアリングメッセージとフォローアップメッセージを含む、ユーザーが書いたメッセージの後の最初のリクエスト |
| `continuation` | ツールの結果や拡張機能のメッセージの後など、エージェントループ内のその他のリクエスト |
| `retry` | コンテキストのオーバーフローに伴う圧縮後を含む、失敗したリクエスト後の自動再試行 |
| `direct` | 圧縮の要約や、拡張機能による`ctx.modelRegistry.streamSimple()`の呼び出しなど、エージェントループ外で行われるリクエスト |

`continuation`に対して`previous`を、`retry`に対して`failed`を返すと、プロンプトキャッシュと推論シグネチャの有効性が維持されます。ターン間でモデルを切り替えることはできますが、プロンプトキャッシュは失われます。たとえば、`failed.message.errorMessage`によってプロバイダーの過負荷やコンテキストのオーバーフローが報告された場合、再試行時に別のモデルへ切り替えることもできます。

`route()`が例外をスローした場合、または仮想モデルや認証情報のないモデルを返した場合、リクエストはエラーレスポンスで終了します。

## ルーティング状態を保持する

`route()`は、モデルとともに`state`を返すことができます。Pi はこれをセッション分岐に保存し、後続のリクエストで`request.state`としてルーターへ返します。分類器の結果やルーティングフェーズなど、トランスクリプトに記録されない判断に使用します。

```typescript
pi.registerVirtualModel<{ phase: "plan" | "build" }>({
  provider: "router",
  id: "phased",
  name: "Phased",
  route(request, ctx) {
    const state = request.state ?? { phase: "plan" };
    const id = state.phase === "plan" ? "claude-opus-4-5" : "claude-haiku-4-5";
    return { model: ctx.modelRegistry.find("anthropic", id)!, thinkingLevel: "medium", state };
  },
});
```

- 状態は JSON シリアライズ可能である必要があります。`undefined`または`request.state`自体を返すと、現在の状態が維持されます。
- Pi は、それ以外の返されたオブジェクトを、現在の状態と等しい場合でも、リクエストの送信前に新しい状態として保存します。状態が変化した場合にのみ、新しいオブジェクトを返してください。その後リクエストが失敗しても、状態は保存されたままです。
- 状態はセッションツリーに従うため、フォークや`/tree`による移動では、それぞれの分岐の状態が参照されます。状態は圧縮後も維持されます。
- `direct`リクエストには状態がなく、Pi はそれらが返す状態を無視します。

トランスクリプトには、選択内容とディスパッチされたすべてのモデルがすでに記録されており、`ctx.sessionManager.getBranch()`からその両方にアクセスできます。

ルーターは`ctx.modelRegistry`を通じて他のモデルを呼び出せます。たとえば、`ctx.modelRegistry.findOfType("classifier", provider, id)`から取得した分類器モデルを`ctx.modelRegistry.classify()`で呼び出せます。この呼び出しにより、ターンの最初のトークンが返されるまでの遅延が増加します。

完全なルーターについては、[`jev-router.ts`](../examples/extensions/jev-router.ts)を参照してください。このルーターは、Jev 分類器が選択した高性能な OpenAI Codex モデルで計画を立て、そのモデルに最初の編集を行わせた後、プロンプトキャッシュのミスを1回許容して、より安価なモデルへ一度だけ切り替えます。フェーズはルーターの状態として保持されます。
