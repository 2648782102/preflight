import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTerminal } from '../src/report/terminal.js';

const res = (severity, category, title, file, line) => ({ ruleId: title.toLowerCase().replace(/\W+/g, '-'), title, category, severity, file, line, message: `${title} message`, fix: `${title} fix` });
const report = {
  root: '/tmp/app', rulesRun: 8, filesScanned: 42, score: 62, grade: 'D',
  counts: { critical: 3, warning: 2, info: 1 },
  byCategory: { security: 4, reliability: 1, launch: 1 },
  results: [
    res('warning', 'launch', 'No privacy policy', 'src/auth.ts'),
    res('critical', 'security', 'Live secret in client-side code', 'src/lib/stripe.ts', 2),
    res('info', 'reliability', 'No error monitoring', 'package.json'),
    res('critical', 'security', 'Supabase table without row-level security', 'supabase/migrations/001.sql', 2),
  ],
};

test('color false emits no ANSI codes', () => {
  assert.doesNotMatch(renderTerminal(report, { color: false }), /\x1b\[/);
});

test('color true emits ANSI codes', () => {
  assert.match(renderTerminal(report, { color: true }), /\x1b\[/);
});

test('shows score, grade and counts', () => {
  const out = renderTerminal(report, { color: false });
  assert.match(out, /62 \/ 100/);
  assert.match(out, /Grade D/);
  assert.match(out, /3 critical · 2 warnings · 1 info/);
  assert.match(out, /src\/lib\/stripe\.ts:2/);
  assert.match(out, /Live secret in client-side code fix/);
});

test('groups findings under category headings in order security, reliability, launch', () => {
  const out = renderTerminal(report, { color: false });
  const s = out.indexOf('SECURITY'), r = out.indexOf('RELIABILITY'), l = out.indexOf('LAUNCH');
  assert.ok(s > -1 && s < r && r < l, `${s} ${r} ${l}`);
  assert.ok(out.indexOf('CRITICAL') < out.indexOf('WARNING'));
});

test('clean report says no issues', () => {
  const out = renderTerminal({ ...report, score: 100, grade: 'A', counts: { critical: 0, warning: 0, info: 0 }, byCategory: { security: 0, reliability: 0, launch: 0 }, results: [] }, { color: false });
  assert.match(out, /No issues found/);
  assert.match(out, /Grade A/);
});

test('every box line has the same visible width', () => {
  const out = renderTerminal(report, { color: true });
  const box = out.split('\n').filter((l) => /^[╭│╰]/.test(l.replace(/\x1b\[[0-9;]*m/g, '')));
  const widths = new Set(box.map((l) => [...l.replace(/\x1b\[[0-9;]*m/g, '')].length));
  assert.equal(widths.size, 1, [...widths].join(','));
});
