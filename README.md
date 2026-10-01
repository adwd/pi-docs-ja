# Pi 日本語ドキュメント

[**日本語ドキュメントを読む →**](https://adwd.github.io/pi-docs-ja/docs/latest/)

[Pi 公式ドキュメント](https://pi.dev/docs/latest)の非公式日本語訳です。[原文 Markdown](https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs)を機械翻訳し、独立したモデル実行で対訳を確認しています。

Astro で Markdown を HTML に変換し、GitHub Pages で公開します。日本語検索、ライト／ダークテーマ、目次、コードのコピー、原文リンク、翻訳元コミット表示に対応しています。本家の英語の見出し ID を維持しているため、原稿中のページ内リンクもそのまま機能します。

## 構成

| パス                      | 内容                                   |
| ------------------------- | -------------------------------------- |
| `content/ja/`             | 日本語 Markdown                        |
| `content/source/`         | 翻訳に使った英語のスナップショット     |
| `content/navigation.json` | 翻訳した本家の目次・リダイレクト       |
| `content/provenance.json` | 翻訳元コミット、ハッシュ、レビュー情報 |
| `src/`                    | Astro の表示・リンク変換・スタイル     |
| `public/upstream-images/` | 本家の画像                             |

翻訳処理と ChatGPT 認証は別の private リポジトリで管理します。この公開リポジトリには認証情報を置きません。日次の差分翻訳で作った PR がサイト検証に合格すると自動マージされ、GitHub Pages が更新されます。

## 開発

Node.js 24 を使用します。

```sh
npm ci --ignore-scripts
npm run dev
```

開発 URL は `http://localhost:4321/pi-docs-ja/docs/latest/` です。

```sh
npm test
npm run build
npm run check:links
npm run preview
```

公開前にページの網羅性、原文と訳文のハッシュ、コード・URL・構造の保持、英語の見出し ID、生成 HTML の内部リンクを検証します。`npm run build` は Pagefind の日本語検索インデックスも作成します。検索の確認にはビルド後のプレビューを使用してください。

## 修正

誤訳は Issue で原文と該当箇所をお知らせください。日本語 Markdown を手修正した場合は `content/provenance.json` の該当 `translationHash` も更新してください。訳語の恒久的な変更は翻訳側の用語集にも反映します。原文が同じページの手修正は次の同期でも維持されます。

## ライセンス・出典

原文・画像: [earendil-works/pi](https://github.com/earendil-works/pi)。原文の MIT License は [LICENSE-upstream](LICENSE-upstream) に収録しています。日本語訳・サイト実装は [MIT License](LICENSE) です。

このサイトは Pi の公式サイトではありません。訳文に疑問がある場合は各ページの原文リンクを参照してください。
