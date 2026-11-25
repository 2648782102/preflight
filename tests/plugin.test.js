import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('plugin manifest is valid', () => {
  const manifest = JSON.parse(read('.claude-plugin/plugin.json'));
  assert.equal(manifest.name, 'preflight');
  assert.equal(manifest.version, JSON.parse(read('package.json')).version);
  assert.ok(existsSync(new URL('../commands/preflight.md', import.meta.url)));
  assert.match(read('commands/preflight.md'), /vibe-preflight --json/);
  assert.match(read('README.md'), /Claude Code/);
});

test('repo doubles as a plugin marketplace listing the plugin', () => {
  const m = JSON.parse(read('.claude-plugin/marketplace.json'));
  assert.equal(m.plugins[0].name, 'preflight');
  assert.match(read('README.md'), /\/plugin marketplace add erdellll\/preflight/);
});
