import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { run } from '../src/run.js';
import { loadRules } from '../src/rules/index.js';

const root = fileURLToPath(new URL('./fixtures/ignore/', import.meta.url));
const fakeRule = {
  id: 'fake', title: 'Fake', category: 'security', severity: 'warning',
  check: (project) => project.lines('app.js').flatMap((l, i) => (l.includes('BAD') ? [{ file: 'app.js', line: i + 1, message: 'bad', fix: 'fix it' }] : [])),
};

test('run honours preflight-ignore on the same and previous line', async () => {
  const report = await run(root, { rules: [fakeRule] });
  assert.deepEqual(report.results.map((x) => x.line), [1]);
  assert.equal(report.results[0].ruleId, 'fake');
  assert.equal(report.results[0].severity, 'warning');
  assert.equal(report.rulesRun, 1);
  assert.equal(report.score, 95);
});

test('run honours --ignore', async () => {
  const report = await run(root, { rules: [fakeRule], ignore: ['fake'] });
  assert.equal(report.results.length, 0);
});

test('loadRules skips index and underscore files and sorts by id', async () => {
  const rules = await loadRules();
  const ids = rules.map((x) => x.id);
  assert.deepEqual(ids, [...ids].sort());
  assert.ok(!ids.includes('_template'));
});
