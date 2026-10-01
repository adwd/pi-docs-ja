import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteUrl, provenance, BASE } from '../src/lib/content.mjs';
test('documentation URLs retain fragments and queries after adding the Pages base', () => {
  assert.equal(
    rewriteUrl('models.md#choose-a-model', 'index.md'),
    `${BASE}/docs/latest/models/#choose-a-model`,
  );
  assert.equal(
    rewriteUrl('/docs/latest/mcp?view=all#control-tool-exposure', 'index.md'),
    `${BASE}/docs/latest/mcp/?view=all#control-tool-exposure`,
  );
  assert.equal(
    rewriteUrl('session.md', 'index.md'),
    `${BASE}/docs/latest/session-format/`,
  );
});
test('links outside the docs use the immutable upstream snapshot', () => {
  assert.equal(
    rewriteUrl('../examples/extensions/foo.ts', 'index.md'),
    `https://github.com/${provenance.repository}/blob/${provenance.commit}/packages/coding-agent/examples/extensions/foo.ts`,
  );
  assert.equal(
    rewriteUrl('images/interactive-mode.png', 'index.md'),
    `${BASE}/upstream-images/interactive-mode.png`,
  );
});
test('missing local docs and executable URL schemes cannot silently pass', () => {
  assert.throws(
    () => rewriteUrl('missing.md', 'index.md'),
    /Missing documentation/,
  );
  assert.equal(rewriteUrl('javascript:alert(1)', 'index.md'), '');
});
