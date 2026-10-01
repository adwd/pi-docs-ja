import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'parse5';
const origin = 'https://adwd.github.io',
  base = '/pi-docs-ja';
async function htmlFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
export function inspect(html) {
  const ids = new Set(),
    links = [],
    duplicates = [];
  function walk(n) {
    const attrs = Object.fromEntries(
      (n.attrs || []).map((a) => [a.name, a.value]),
    );
    if (attrs.id) {
      if (ids.has(attrs.id)) duplicates.push(attrs.id);
      ids.add(attrs.id);
    }
    for (const attr of ['href', 'src'])
      if (attrs[attr]) links.push(attrs[attr]);
    for (const c of n.childNodes || []) walk(c);
  }
  walk(parse(html));
  return { ids, links, duplicates };
}
export async function checkLinks(dir = resolve('dist')) {
  const files = await htmlFiles(dir),
    data = new Map();
  for (const f of files) data.set(f, inspect(await readFile(f, 'utf8')));
  const errors = [];
  let count = 0;
  for (const [file, doc] of data) {
    const path = '/' + relative(dir, file).replaceAll('\\', '/');
    const pageUrl = origin + base + path.replace(/index\.html$/, '');
    for (const id of doc.duplicates) errors.push(`${path}: duplicate id ${id}`);
    for (const value of doc.links) {
      if (/^(mailto:|data:|javascript:)/.test(value)) continue;
      const url = new URL(value, pageUrl);
      if (
        url.origin !== origin ||
        !(url.pathname === base || url.pathname.startsWith(base + '/'))
      )
        continue;
      let target = resolve(
        dir,
        decodeURIComponent(url.pathname.slice(base.length)).replace(/^\//, ''),
      );
      if (target !== dir && !target.startsWith(dir + '/')) {
        errors.push(`${path}: invalid local URL ${value}`);
        continue;
      }
      try {
        if ((await stat(target)).isDirectory())
          target = join(target, 'index.html');
        await stat(target);
      } catch {
        errors.push(`${path}: missing ${value}`);
        continue;
      }
      if (url.hash && data.has(target)) {
        const id = decodeURIComponent(url.hash.slice(1));
        if (!data.get(target).ids.has(id))
          errors.push(`${path}: missing anchor ${value}`);
      }
      count++;
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    `Checked ${count} local links and anchors in ${files.length} HTML pages.`,
  );
  return count;
}
if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await checkLinks();
