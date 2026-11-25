import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/project.js';

const fixtures = fileURLToPath(new URL('./fixtures/walker/', import.meta.url));

test('walker lists files with posix paths, sorted', async () => {
  const p = await loadProject(path.join(fixtures, 'basic'));
  assert.deepEqual(p.files, ['.gitignore', 'README.md', 'src/a.js']);
});

test('walker skips ignored directories', async () => {
  const p = await loadProject(path.join(fixtures, 'basic'));
  for (const f of ['node_modules/x.js', '.next/y.js', 'dist/z.js']) assert.ok(!p.files.includes(f), f);
});

test('walker skips binaries and files over 1 MB', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'preflight-'));
  writeFileSync(path.join(dir, 'big.js'), 'a'.repeat(1.1 * 1024 * 1024));
  writeFileSync(path.join(dir, 'logo.png'), 'png');
  writeFileSync(path.join(dir, 'ok.js'), 'ok');
  const p = await loadProject(dir);
  assert.deepEqual(p.files, ['ok.js']);
});

test('lines splits CRLF correctly', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'preflight-'));
  mkdirSync(path.join(dir, 'src'));
  writeFileSync(path.join(dir, 'src', 'w.js'), 'a\r\nb\r\n');
  const p = await loadProject(dir);
  assert.equal(p.lines('src/w.js')[1], 'b');
  assert.equal(p.read('missing.js'), '');
});

test('gitignore is read', async () => {
  const p = await loadProject(path.join(fixtures, 'basic'));
  assert.ok(p.gitignore.includes('.env'));
  assert.ok(p.has(/^src\/a\.js$/));
});
