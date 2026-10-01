import { readFileSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { Marked } from 'marked';
import { createHighlighter } from 'shiki';
import sanitizeHtml from 'sanitize-html';

export const BASE = '/pi-docs-ja';
export const provenance = JSON.parse(
  readFileSync(resolve('content/provenance.json'), 'utf8'),
);
export const navigation = JSON.parse(
  readFileSync(resolve('content/navigation.json'), 'utf8'),
);
export const paths = (nodes) =>
  nodes.flatMap((n) => (n.path ? [n.path] : paths(n.items || [])));
export const pagePaths = paths(navigation.navigation);
export const hrefFor = (path) =>
  `${BASE}/docs/latest/${path === 'index.md' ? '' : path.replace(/\.md$/, '') + '/'}`;
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
// Upstream still links to these old MCP headings at 0f8740b. Keep the
// Markdown unchanged and provide compatibility anchors beside the new headings.
const legacyAnchors = {
  'mcp.md': {
    'control-tool-exposure': ['exposure'],
    'replace-the-built-in-mcp-support': ['other-mcp-extensions'],
  },
};
const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: [
    'bash',
    'shell',
    'typescript',
    'javascript',
    'json',
    'jsonc',
    'yaml',
    'markdown',
    'python',
    'powershell',
    'toml',
    'html',
    'css',
    'diff',
    'text',
    'console',
    'xml',
  ],
});

export function rewriteUrl(url, page) {
  if (!url || url.startsWith('#') || /^(?:https?:|mailto:|data:)/i.test(url))
    return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
  if (/^\/docs\/latest(?:[/?#]|$)/.test(url)) {
    const local = new URL(url, 'https://pi.dev');
    return (
      BASE + local.pathname.replace(/\/$/, '') + '/' + local.search + local.hash
    );
  }
  if (url.startsWith('/')) return 'https://pi.dev' + url;
  const match = url.match(/^([^?#]*)(.*)$/),
    path = posix.normalize(posix.join(posix.dirname(page), match[1])),
    suffix = match[2];
  if (path.startsWith('images/'))
    return `${BASE}/upstream-images/${path.slice(7)}${suffix}`;
  if (pagePaths.includes(path)) return hrefFor(path) + suffix;
  const redirect = navigation.redirects?.find((r) => r.from === path);
  if (redirect) return hrefFor(redirect.to) + suffix;
  if (path.endsWith('.md') && !path.startsWith('../'))
    throw new Error(`Missing documentation target ${page} -> ${url}`);
  const repositoryPath = posix.normalize(posix.join(provenance.docsPath, path));
  return `https://github.com/${provenance.repository}/blob/${provenance.commit}/${repositoryPath}${suffix}`;
}
export async function renderPage(path) {
  const markdown = readFileSync(resolve('content/ja', path), 'utf8');
  const meta = provenance.pages[path];
  let headingIndex = 0;
  const toc = [];
  const renderer = {
    heading({ tokens, depth }) {
      const h = meta.headings[headingIndex++];
      if (!h || h.depth !== depth)
        throw new Error('Heading/source mismatch: ' + path);
      const content = this.parser.parseInline(tokens);
      const text = sanitizeHtml(content, {
        allowedTags: [],
        allowedAttributes: {},
      });
      if (depth > 1) toc.push({ depth, text, id: h.id });
      if (depth === 1)
        return `<span id="${escape(h.id)}" class="page-top-anchor"></span>`;
      const aliases = (legacyAnchors[path]?.[h.id] || [])
        .filter(
          (id) =>
            !meta.headings.some((x) => x.id === id) &&
            !new RegExp(`id=["']${id}["']`).test(markdown),
        )
        .map((id) => `<span id="${id}" class="page-top-anchor"></span>`)
        .join('');
      return `${aliases}<h${depth} id="${escape(h.id)}">${content}<a class="heading-anchor" href="#${escape(h.id)}" aria-label="この見出しへのリンク" data-pagefind-ignore>#</a></h${depth}>`;
    },
    link({ href, title, tokens }) {
      return `<a href="${escape(rewriteUrl(href, path))}"${title ? ` title="${escape(title)}"` : ''}>${this.parser.parseInline(tokens)}</a>`;
    },
    image({ href, title, text }) {
      return `<img src="${escape(rewriteUrl(href, path))}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ''} loading="lazy"/>`;
    },
    html({ text }) {
      return text
        .replace(
          /\b(href|src)=(['"])(.*?)\2/g,
          (_, attr, q, url) =>
            `${attr}=${q}${escape(rewriteUrl(url, path))}${q}`,
        )
        .replace(
          /\balt=(['"])(.*?)\1/g,
          (_, q, alt) => `alt=${q}${escape(meta.imageAlts?.[alt] || alt)}${q}`,
        );
    },
    code({ text, lang }) {
      const language = (lang || 'text').split(/\s/)[0];
      const selected = highlighter.getLoadedLanguages().includes(language)
        ? language
        : 'text';
      return `<div class="code-block"><div class="code-bar" data-pagefind-ignore><span>${escape(language)}</span><button type="button" class="copy-code" aria-label="コードをコピー">コピー</button></div>${highlighter.codeToHtml(text, { lang: selected, themes: { light: 'github-light', dark: 'github-dark' } })}</div>`;
    },
  };
  const parser = new Marked({ gfm: true, renderer });
  const raw = await parser.parse(markdown);
  const html = sanitizeHtml(raw, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      'img',
      'button',
      'span',
      'input',
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': [
        'id',
        'class',
        'aria-label',
        'aria-hidden',
        'tabindex',
        'data-pagefind-ignore',
      ],
      img: ['src', 'alt', 'width', 'height', 'loading'],
      a: ['href', 'title', 'target', 'rel'],
      button: ['type', 'aria-label', 'class'],
      pre: ['class', 'style', 'tabindex'],
      span: ['class', 'style', 'id'],
      input: ['type', 'checked', 'disabled'],
      p: ['align'],
    },
    allowedSchemes: ['https', 'http', 'mailto'],
    allowedStyles: {
      '*': {
        color: [/^#[a-f0-9]+$/i],
        'background-color': [/^#[a-f0-9]+$/i],
        '--shiki-dark': [/^#[a-f0-9]+$/i],
        '--shiki-dark-bg': [/^#[a-f0-9]+$/i],
        'font-style': [/^(italic|normal)$/],
        'font-weight': [/^[0-9]+$/],
        'text-decoration': [/^none$/],
      },
    },
  });
  return {
    html,
    toc,
    meta,
    description: sanitizeHtml(raw, { allowedTags: [], allowedAttributes: {} })
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 150),
  };
}
