import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPreserved,
  blocks,
  restore,
  headings,
} from '../scripts/markdown.mjs';
import { inspect } from '../scripts/check-links.mjs';
test('rejects moved code blocks and changed list nesting', () => {
  assert.throws(() =>
    assertPreserved(
      '```sh\none\n```\n\n```sh\ntwo\n```',
      '```sh\ntwo\n```\n\n```sh\none\n```',
    ),
  );
  assert.throws(() => assertPreserved('- a\n  - b\n- c', '- a\n- b\n  - c'));
});
test('rejects code, destination, negation-relevant inline code and table damage', () => {
  const source =
    '# Setup\n\nRun `pi --no-session`. [Docs](usage.md#options)\n\n```sh\npi\n```\n\n| A | B |\n| - | - |\n| one | two |';
  const japanese = source
    .replace('Setup', 'セットアップ')
    .replace('Run', '実行')
    .replace('Docs', 'ドキュメント');
  assert.doesNotThrow(() => assertPreserved(source, japanese));
  for (const damaged of [
    japanese.replace('--no-session', '--session'),
    japanese.replace('usage.md', 'security.md'),
    japanese.replace('pi\n```', 'curl bad\n```'),
    japanese.replace('| one | two |', '| one |'),
  ])
    assert.throws(() => assertPreserved(source, damaged));
});
test('protected placeholders cannot disappear or multiply', () => {
  const [b] = blocks('Use `pi` and [the guide](guide.md).');
  assert.equal(restore(b, b.masked), b.raw);
  assert.throws(() => restore(b, b.masked.replace(b.keep[0].token, '')));
  assert.throws(() => restore(b, b.masked + b.keep[0].token));
});
test('original heading anchors retain duplicate suffixes', () =>
  assert.deepEqual(
    headings('# Usage\n## Options\n## Options').map((h) => h.id),
    ['usage', 'options', 'options-1'],
  ));
test('HTML inspection decodes anchors and detects duplicate IDs', () => {
  const doc = inspect(
    '<h2 id="a&amp;b">A</h2><a href="#a&amp;b">x</a><p id="a&amp;b">B</p>',
  );
  assert(doc.ids.has('a&b'));
  assert.deepEqual(doc.links, ['#a&b']);
  assert.deepEqual(doc.duplicates, ['a&b']);
});
