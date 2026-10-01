import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { hash, headings, assertPreserved } from './markdown.mjs';

export function paths(nodes) {
  return nodes.flatMap((n) => (n.path ? [n.path] : paths(n.items || [])));
}
async function markdownFiles(dir, prefix = '') {
  const all = [];
  for (const f of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const path = prefix + f.name;
    if (f.isDirectory()) all.push(...(await markdownFiles(dir, path + '/')));
    else if (f.name.endsWith('.md')) all.push(path);
  }
  return all.sort();
}
export async function validate(root = process.cwd()) {
  const json = async (file) =>
    JSON.parse(await readFile(join(root, file), 'utf8'));
  const navigation = await json('content/navigation.json'),
    provenance = await json('content/provenance.json');
  assert.equal(provenance.schemaVersion, 1);
  assert.match(provenance.commit, /^[a-f0-9]{40}$/);
  assert.equal(provenance.repository, 'earendil-works/pi');
  assert.equal(provenance.docsPath, 'packages/coding-agent/docs');
  const pages = paths(navigation.navigation);
  assert.equal(new Set(pages).size, pages.length, 'Duplicate navigation entry');
  assert(pages.includes('index.md'));
  for (const path of pages)
    assert.match(path, /^(?:[a-z0-9_-]+\/)*[a-z0-9_-]+\.md$/);
  const expected = [...pages].sort();
  assert.deepEqual(
    Object.keys(provenance.pages).sort(),
    expected,
    'Provenance coverage',
  );
  assert.deepEqual(
    await markdownFiles(join(root, 'content/ja')),
    expected,
    'Japanese page coverage',
  );
  assert.deepEqual(
    await markdownFiles(join(root, 'content/source')),
    expected,
    'Source page coverage',
  );
  for (const path of pages) {
    const source = await readFile(join(root, 'content/source', path), 'utf8'),
      translated = await readFile(join(root, 'content/ja', path), 'utf8'),
      meta = provenance.pages[path];
    assert.equal(hash(source), meta.sourceHash, `${path}: source hash`);
    assert.equal(
      hash(translated),
      meta.translationHash,
      `${path}: translation hash`,
    );
    assertPreserved(source, translated);
    assert.deepEqual(
      headings(source),
      meta.headings,
      `${path}: original heading anchors`,
    );
    assert.deepEqual(
      headings(source).map((h) => h.depth),
      headings(translated).map((h) => h.depth),
      `${path}: heading order`,
    );
    assert.equal(meta.title, headings(translated)[0]?.text);
    assert.equal(meta.review.status, 'passed', `${path}: semantic review`);
    assert.match(meta.sourceCommit, /^[a-f0-9]{40}$/);
    assert(Number.isFinite(Date.parse(meta.translatedAt)));
    assert(!translated.includes('PI_KEEP_'), 'Leaked placeholder');
  }
  for (const r of navigation.redirects || []) {
    assert(pages.includes(r.to), `Redirect destination: ${r.to}`);
    assert(!pages.includes(r.from), `Redirect shadows page: ${r.from}`);
    assert.match(r.from, /^[a-z0-9_-]+\.md$/);
  }
  console.log(
    `Validated ${pages.length} Japanese pages: source hashes, review status, code, links, structure, and English anchors.`,
  );
  return pages.length;
}
if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  await validate();
