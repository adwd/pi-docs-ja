# RPC 拡張機能 UI

拡張機能は、`ctx.ui` を通じてユーザー操作を要求できます。RPC モードでは、サポートされている呼び出しは、通常の [RPC コマンド](rpc-commands.md)および[セッションイベント](json.md)と並行するリクエスト／レスポンス形式のサブプロトコルになります。

拡張機能の UI メソッドには、次の 2 つのカテゴリがあります。

- **ダイアログメソッド**（`select`、`confirm`、`input`、`editor`）：標準出力に `extension_ui_request` を出力し、一致する `id` を持つ `extension_ui_response` がクライアントから標準入力に返されるまでブロックします。
- **ファイア・アンド・フォーゲットメソッド**（`notify`、`setStatus`、`setWidget`、`setTitle`、`set_editor_text`）：標準出力に `extension_ui_request` を出力しますが、レスポンスは待機しません。クライアントは情報を表示することも、無視することもできます。

ダイアログメソッドに `timeout` フィールドが含まれる場合、タイムアウトするとエージェント側がデフォルト値で自動的に解決します。クライアントがタイムアウトを追跡する必要はありません。

## 制限事項

一部の `ExtensionUIContext` メソッドは端末 UI への直接アクセスを必要とするため、RPC モードではサポートされないか、機能が制限されます。

- `custom()` は `undefined` を返します。
- `onTerminalInput()` は何もしない購読解除関数を返します。
- `setWorkingMessage()`、`setWorkingVisible()`、`setWorkingIndicator()`、`setHiddenThinkingLabel()`、`setFooter()`、`setHeader()`、`addAutocompleteProvider()`、`setEditorComponent()`、`setToolsExpanded()` は何もしません。
- `getEditorText()` は `""` を返し、`getEditorComponent()` は `undefined` を返します。
- `getToolsExpanded()` は `false` を返します。
- `pasteToEditor()` は、端末の貼り付け処理を行わずに `setEditorText()` へ委譲します。
- `getAllThemes()` は `[]` を返し、`getTheme()` は `undefined` を返します。
- `setTheme()` は `{ success: false, error: "Theme switching not supported in RPC mode" }` を返します。

注：ダイアログメソッドとファイア・アンド・フォーゲットメソッドは拡張機能 UI サブプロトコルを通じて機能するため、RPC モードでは `ctx.mode` は `"rpc"`、`ctx.hasUI` は `true` です。実際の端末を必要とする `custom()` など、TUI 固有の機能をガードするには `ctx.mode === "tui"` を使用してください。

## Pi からのリクエスト

すべてのリクエストには `type: "extension_ui_request"`、一意の `id`、および `method` フィールドがあります。

### select

リストから項目を選択するようユーザーに求めます。`timeout` フィールドを持つダイアログメソッドには、ミリ秒単位のタイムアウトが含まれます。クライアントが時間内に応答しない場合、エージェントは `undefined` で自動的に解決します。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-1",
  "method": "select",
  "title": "Allow dangerous command?",
  "options": ["Allow", "Block"],
  "timeout": 10000
}
```

期待されるレスポンス：`value`（選択された項目の文字列）または `cancelled: true` を持つ `extension_ui_response`。

### confirm

ユーザーに「はい」または「いいえ」での確認を求めます。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-2",
  "method": "confirm",
  "title": "Clear session?",
  "message": "All messages will be lost.",
  "timeout": 5000
}
```

期待されるレスポンス：`confirmed: true/false` または `cancelled: true` を持つ `extension_ui_response`。

### input

ユーザーに自由形式のテキスト入力を求めます。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-3",
  "method": "input",
  "title": "Enter a value",
  "placeholder": "type something..."
}
```

期待されるレスポンス：`value`（入力されたテキスト）または `cancelled: true` を持つ `extension_ui_response`。

### editor

任意で内容が事前入力された複数行テキストエディターを開きます。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-4",
  "method": "editor",
  "title": "Edit some text",
  "prefill": "Line 1\nLine 2\nLine 3"
}
```

期待されるレスポンス：`value`（編集後のテキスト）または `cancelled: true` を持つ `extension_ui_response`。

### notify

通知を表示します。ファイア・アンド・フォーゲット方式であり、レスポンスは想定されません。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-5",
  "method": "notify",
  "message": "Command blocked by user",
  "notifyType": "warning"
}
```

`notifyType` フィールドは `"info"`、`"warning"`、または `"error"` です。省略した場合のデフォルトは `"info"` です。

### setStatus

フッター／ステータスバーのステータス項目を設定または消去します。ファイア・アンド・フォーゲット方式です。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-6",
  "method": "setStatus",
  "statusKey": "my-ext",
  "statusText": "Turn 3 running..."
}
```

そのキーのステータス項目を消去するには、`statusText: undefined` を送信するか、この値を省略します。

### setWidget

エディターの上または下に表示されるウィジェット（テキスト行のブロック）を設定または消去します。ファイア・アンド・フォーゲット方式です。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-7",
  "method": "setWidget",
  "widgetKey": "my-ext",
  "widgetLines": ["--- My Widget ---", "Line 1", "Line 2"],
  "widgetPlacement": "aboveEditor"
}
```

ウィジェットを消去するには、`widgetLines: undefined` を送信するか、この値を省略します。`widgetPlacement` フィールドは `"aboveEditor"`（デフォルト）または `"belowEditor"` です。RPC モードでは文字列配列のみがサポートされ、コンポーネントファクトリは無視されます。

### setTitle

端末のウィンドウ／タブのタイトルを設定します。ファイア・アンド・フォーゲット方式です。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-8",
  "method": "setTitle",
  "title": "pi - my project"
}
```

### set_editor_text

入力エディター内のテキストを設定します。ファイア・アンド・フォーゲット方式です。

```json
{
  "type": "extension_ui_request",
  "id": "uuid-9",
  "method": "set_editor_text",
  "text": "prefilled text for the user"
}
```

## Pi へのレスポンス

レスポンスはダイアログメソッド（`select`、`confirm`、`input`、`editor`）に対してのみ送信されます。`id` はリクエストと一致する必要があります。

### 値のレスポンス（select、input、editor）

```json
{"type": "extension_ui_response", "id": "uuid-1", "value": "Allow"}
```

### 確認のレスポンス（confirm）

```json
{"type": "extension_ui_response", "id": "uuid-2", "confirmed": true}
```

### キャンセルのレスポンス（任意のダイアログ）

任意のダイアログメソッドを閉じます。拡張機能は `undefined`（select/input/editor の場合）または `false`（confirm の場合）を受け取ります。

```json
{"type": "extension_ui_response", "id": "uuid-3", "cancelled": true}
```

## 例

検証済みの [RPC 拡張機能 UI クライアント](../examples/rpc-extension-ui.ts)と、その[デモ拡張機能](../examples/extensions/rpc-demo.ts)を参照してください。

エクスポートされるリクエストとレスポンスの共用体は [`rpc-types.ts`](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/src/modes/rpc/rpc-types.ts) で定義されています。モードに依存しない拡張機能のガイダンスについては、[拡張機能](extensions.md#ui-and-modes)を参照してください。
