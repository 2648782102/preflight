import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main } from '../src/cli.js';
import { fixtureDir } from './helpers.js';

function io(cwd) {
  const out = { stdout: '', stderr: '' };
  return { out, io: { cwd, stdout: { write: (s) => { out.stdout += s; } }, stderr: { write: (s) => { out.stderr += s; } } } };
}
const empty = () => mkdtempSync(path.join(tmpdir(), 'preflight-empty-'));

test('cli --json prints parseable report', async () => {
  const { out, io: x } = io(empty());
  const code = await main(['--json'], x);
  assert.equal(typeof JSON.parse(out.stdout).score, 'number');
  assert.equal(code, 0);
});

test('cli exits 1 on critical by default, 0 with --fail-on never', async () => {
  const dir = fixtureDir('secret-in-client', 'bad');
  assert.equal(await main([dir], io(dir).io), 1);
  assert.equal(await main([dir, '--fail-on', 'never'], io(dir).io), 0);
});

test('cli --fail-on warning exits 1 on a warning', async () => {
  const dir = fixtureDir('cors-wildcard', 'bad');
  assert.equal(await main([dir], io(dir).io), 0);
  assert.equal(await main([dir, '--fail-on', 'warning'], io(dir).io), 1);
});

test('cli on an empty folder prints a clean card and exits 0', async () => {
  const { out, io: x } = io(empty());
  assert.equal(await main([], x), 0);
  assert.match(out.stdout, /No issues found/);
  assert.match(out.stdout, /100 \/ 100/);
});

test('cli exits 2 for a missing path or a bad flag', async () => {
  const a = io(empty());
  assert.equal(await main(['/definitely/not/here'], a.io), 2);
  assert.match(a.out.stderr, /not found/i);
  assert.equal(await main(['--nope'], io(empty()).io), 2);
  assert.equal(await main(['--fail-on', 'sometimes'], io(empty()).io), 2);
});

test('cli --html writes the file', async () => {
  const dir = empty();
  const { out, io: x } = io(dir);
  assert.equal(await main(['--html'], x), 0);
  const file = path.join(dir, 'preflight-report.html');
  assert.ok(existsSync(file));
  assert.ok(readFileSync(file, 'utf8').toLowerCase().startsWith('<!doctype html>'));
  assert.match(out.stdout, /preflight-report\.html/);
});

test('cli --ignore drops a rule', async () => {
  const dir = fixtureDir('secret-in-client', 'bad');
  assert.equal(await main([dir, '--ignore', 'secret-in-client'], io(dir).io), 0);
});

// A typo in --ignore is silent today: the id matches nothing, the run looks like the rule passed,
// and the user keeps a check they meant to switch off (#19).
test('cli --ignore warns about an unknown id, suggests the closest one, and still scans', async () => {
  const dir = fixtureDir('secret-in-client', 'bad');
  const { out, io: x } = io(dir);
  const code = await main([dir, '--ignore', 'secret-in-clien'], x);
  assert.match(out.stderr, /secret-in-clien/);
  assert.match(out.stderr, /secret-in-client/, 'the warning names the id it probably meant');
  // The scan still ran and still failed on the rule that was not actually ignored.
  assert.equal(code, 1);
  assert.match(out.stdout, /preflight/i);
});

test('cli --ignore stays quiet for ids that exist', async () => {
  const dir = fixtureDir('secret-in-client', 'bad');
  const { out, io: x } = io(dir);
  await main([dir, '--ignore', 'secret-in-client'], x);
  assert.equal(out.stderr, '');
});

// Each --demo run copied the sample app into a new temp folder and left it there (#25): three runs
// left three folders, and they accumulated in the OS temp dir for the life of the machine.
test('cli --demo removes the folder it copied the sample app into', async () => {
  const before = new Set(readdirSync(tmpdir()));
  assert.equal(await main(['--demo', '--fail-on', 'never'], io(empty()).io), 0);
  const created = readdirSync(tmpdir()).filter(
    (name) => name.startsWith('preflight-demo-') && !before.has(name),
  );
  assert.deepEqual(created, [], `the run left ${created.join(', ')} behind`);
});

test('cli --version and --help', async () => {
  const v = io(empty());
  assert.equal(await main(['--version'], v.io), 0);
  assert.match(v.out.stdout, /^\d+\.\d+\.\d+/);
  const h = io(empty());
  assert.equal(await main(['--help'], h.io), 0);
  assert.match(h.out.stdout, /--fail-on/);
});

// `--html report.htm` was read as the folder to scan, so the run failed with "Folder not found"
// pointing at a file name (#18). The normaliser only recognised `.html`.
test('cli --html accepts a name ending in .htm as well as .html', async () => {
  const dir = fixtureDir('secret-in-client', 'bad');
  for (const name of ['report.htm', 'report.html']) {
    const { out, io: x } = io(dir);
    await main([dir, '--json', '--html', name], x);
    const written = path.join(dir, name);
    assert.ok(existsSync(written), `--html ${name} wrote nothing`);
    assert.match(readFileSync(written, 'utf8').toLowerCase(), /^<!doctype html/);
    assert.doesNotMatch(out.stderr, /Folder not found/);
    rmSync(written, { force: true });
  }
});
