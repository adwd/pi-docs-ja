import { createHash } from 'node:crypto';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';

export const hash = (s) => createHash('sha256').update(s).digest('hex');
export const parse = (s) =>
  fromMarkdown(s, {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  });
export function walk(n, fn) {
  fn(n);
  for (const c of n.children || []) walk(c, fn);
}
export function headings(source) {
  const slugger = new GithubSlugger(),
    out = [];
  walk(parse(source), (n) => {
    if (n.type === 'heading')
      out.push({
        depth: n.depth,
        text: toString(n),
        id: slugger.slug(toString(n)),
      });
  });
  return out;
}
export function signature(source) {
  const result = {
    code: [],
    inlineCode: [],
    links: [],
    images: [],
    html: [],
    structure: [],
  };
  walk(parse(source), (n) => {
    if (n.type === 'code')
      result.code.push([n.lang ?? '', n.meta ?? '', n.value]);
    if (n.type === 'inlineCode') result.inlineCode.push(n.value);
    if (['link', 'definition'].includes(n.type))
      result.links.push([n.url, n.title ?? '']);
    if (n.type === 'image') result.images.push([n.url, n.title ?? '']);
    if (n.type === 'html') result.html.push(n.value);
    if (
      [
        'heading',
        'list',
        'listItem',
        'table',
        'tableRow',
        'tableCell',
        'blockquote',
        'thematicBreak',
      ].includes(n.type)
    )
      result.structure.push([
        n.type,
        n.depth ?? null,
        n.ordered ?? null,
        n.start ?? null,
        n.checked ?? null,
      ]);
  });
  // Inline terms and links may move for natural Japanese; block order must not.
  for (const k of ['inlineCode', 'links', 'images', 'html'])
    result[k].sort((a, b) =>
      JSON.stringify(a).localeCompare(JSON.stringify(b)),
    );
  return result;
}
export function assertPreserved(source, target) {
  if (!target.trim()) throw new Error('Empty translation');
  if (JSON.stringify(signature(source)) !== JSON.stringify(signature(target)))
    throw new Error(
      'Markdown structure, code, HTML, or link destination changed',
    );
}
export function blocks(source) {
  let context = '';
  const out = [];
  for (const n of parse(source).children) {
    const start = n.position.start.offset,
      end = n.position.end.offset,
      raw = source.slice(start, end);
    if (n.type === 'heading') context = toString(n);
    if (['code', 'html', 'definition', 'thematicBreak'].includes(n.type))
      continue;
    const ranges = [];
    const visit = (node) => {
      const a = node.position?.start.offset,
        b = node.position?.end.offset;
      if (a === undefined) return;
      if (['code', 'inlineCode', 'html'].includes(node.type)) {
        ranges.push({
          start: a - start,
          end: b - start,
          value: source.slice(a, b),
        });
        return;
      }
      if (['link', 'image'].includes(node.type)) {
        const fragment = source.slice(a, b),
          pos = fragment.lastIndexOf('](');
        if (pos >= 0)
          ranges.push({
            start: a - start + pos + 1,
            end: b - start,
            value: fragment.slice(pos + 1),
          });
        else if (fragment.startsWith('<') || fragment === node.url) {
          ranges.push({ start: a - start, end: b - start, value: fragment });
          return;
        }
      }
      for (const c of node.children || []) visit(c);
    };
    visit(n);
    if (raw.includes('PI_KEEP_'))
      throw new Error('Reserved placeholder found in upstream');
    ranges.sort((a, b) => a.start - b.start);
    let masked = raw;
    const keep = ranges.map((r, i) => ({ ...r, token: `PI_KEEP_${i}_END` }));
    for (const r of [...keep].reverse())
      masked = masked.slice(0, r.start) + r.token + masked.slice(r.end);
    out.push({
      id: hash(`${context}\0${raw}`),
      context,
      raw,
      masked,
      keep,
      start,
      end,
    });
  }
  return out;
}
export function restore(block, translated) {
  const expected = block.keep.map((r) => r.token).sort();
  const actual = [...translated.matchAll(/PI_KEEP_\d+_END/g)]
    .map((x) => x[0])
    .sort();
  if (JSON.stringify(expected) !== JSON.stringify(actual))
    throw new Error('Protected placeholder missing or duplicated');
  let target = translated;
  for (const r of block.keep) target = target.replace(r.token, () => r.value);
  assertPreserved(block.raw, target);
  return target;
}
export function assemble(source, parts) {
  let out = source;
  for (const p of [...parts].sort((a, b) => b.start - a.start))
    out = out.slice(0, p.start) + p.translated + out.slice(p.end);
  assertPreserved(source, out);
  return out;
}
export function batches(items, limit) {
  const all = [];
  let cur = [],
    size = 0;
  for (const item of items) {
    if (cur.length && size + item.masked.length > limit) {
      all.push(cur);
      cur = [];
      size = 0;
    }
    cur.push(item);
    size += item.masked.length;
  }
  if (cur.length) all.push(cur);
  return all;
}
