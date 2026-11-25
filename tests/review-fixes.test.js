import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fixtureProject } from './helpers.js';
import { loadProject } from '../src/project.js';
import { isClientFile } from '../src/rules/_client-paths.js';
import rls from '../src/rules/supabase-rls-disabled.js';
import secret from '../src/rules/secret-in-client.js';
import webhook from '../src/rules/stripe-webhook-unverified.js';
import envFile from '../src/rules/env-file-committed.js';

test('C1: supabase-rls-disabled ignores non-Supabase SQL (Prisma)', async () => {
  assert.deepEqual(rls.check(await fixtureProject('supabase-rls-disabled', 'good-prisma')), []);
  assert.equal(rls.check(await fixtureProject('supabase-rls-disabled', 'bad')).length, 1);
});

test('I2: server files are not client code; Expo and monorepo folders are', () => {
  for (const p of ['server.js', 'src/server.ts', 'src/routes/hook/+server.ts', 'app/webhook/route.ts', 'middleware.ts', 'next.config.js']) assert.ok(!isClientFile(p), p);
  for (const p of ['services/openai.ts', 'screens/Chat.tsx', 'hooks/useAI.ts', 'apps/web/src/ai.ts', 'App.tsx', 'src/App.tsx']) assert.ok(isClientFile(p), p);
});

test('I2: secret-in-client is quiet on server files, flags Expo and monorepo client code', async () => {
  assert.deepEqual(secret.check(await fixtureProject('secret-in-client', 'good-server')), []);
  const f = secret.check(await fixtureProject('secret-in-client', 'bad-expo'));
  assert.deepEqual(f.map((x) => x.file).sort(), ['apps/web/src/ai.ts', 'services/openai.ts']);
});

test('I3: service_role JWTs are found by their role claim, anon keys are not', async () => {
  assert.equal(secret.check(await fixtureProject('secret-in-client', 'bad-service-role')).length, 1);
  assert.deepEqual(secret.check(await fixtureProject('secret-in-client', 'good-anon')), []);
});

test('I4: stripe webhook verified through a helper, event lists and UI pages stay quiet', async () => {
  assert.deepEqual(webhook.check(await fixtureProject('stripe-webhook-unverified', 'good-helper')), []);
  assert.equal(webhook.check(await fixtureProject('stripe-webhook-unverified', 'bad')).length, 1);
});

test('I5: **/.env and nested .gitignore files are honoured', async () => {
  assert.deepEqual(envFile.check(await fixtureProject('env-file-committed', 'good-globstar')), []);
  assert.deepEqual(envFile.check(await fixtureProject('env-file-committed', 'good-nested')), []);
});

test('I5: scanning a subfolder honours the repo-root .gitignore', async () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'preflight-repo-'));
  mkdirSync(path.join(repo, '.git'));
  mkdirSync(path.join(repo, 'apps', 'web'), { recursive: true });
  writeFileSync(path.join(repo, '.gitignore'), '.env\n');
  writeFileSync(path.join(repo, 'apps', 'web', '.env'), 'A=1\n');
  assert.deepEqual(envFile.check(await loadProject(path.join(repo, 'apps', 'web'))), []);
});

test('I6: virtualenv and vendor folders are not scanned', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'preflight-venv-'));
  for (const d of ['.venv/lib', 'venv/lib', 'vendor/x', '__pycache__', 'target', '.gradle', '.dart_tool', 'bower_components']) {
    mkdirSync(path.join(dir, d), { recursive: true });
    writeFileSync(path.join(dir, d, 'f.py'), 'x');
  }
  writeFileSync(path.join(dir, 'app.py'), 'x');
  assert.deepEqual((await loadProject(dir)).files, ['app.py']);
});

test('plugin command runs the bundled scanner, not npx', () => {
  const cmd = readFileSync(new URL('../commands/preflight.md', import.meta.url), 'utf8');
  assert.match(cmd, /\$\{CLAUDE_PLUGIN_ROOT\}\/bin\/preflight\.js/);
});
