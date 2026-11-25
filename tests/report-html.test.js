import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderHtml } from '../src/report/html.js';

const report = {
  root: '/tmp/app', rulesRun: 8, filesScanned: 10, score: 62, grade: 'D',
  counts: { critical: 1, warning: 1, info: 0 }, byCategory: { security: 1, reliability: 0, launch: 1 },
  results: [
    { ruleId: 'x', title: 'Bad <thing>', category: 'security', severity: 'critical', file: 'a.js', line: 3, message: '<img onerror=x>', fix: 'Fix & rotate' },
    { ruleId: 'y', title: 'Meh', category: 'launch', severity: 'warning', file: 'index.html', message: 'm', fix: 'f' },
  ],
};

test('html is a self-contained document', () => {
  const html = renderHtml(report);
  assert.ok(html.toLowerCase().startsWith('<!doctype html>'));
  assert.doesNotMatch(html, /<script[^>]+src=/i);
  assert.doesNotMatch(html, /<link[^>]+rel=["']stylesheet/i);
  const external = [...html.matchAll(/(?:src|href)=["'](https?:[^"']+)/g)].map((m) => m[1]);
  assert.deepEqual(external, ['https://github.com/erdellll/preflight']);
});

test('html escapes finding text', () => {
  const html = renderHtml(report);
  assert.match(html, /&lt;img onerror=x&gt;/);
  assert.match(html, /Bad &lt;thing&gt;/);
  assert.match(html, /Fix &amp; rotate/);
  assert.doesNotMatch(html, /<img onerror/);
});

test('html shows score, grade and file:line', () => {
  const html = renderHtml(report);
  assert.match(html, />62</);
  assert.match(html, /Grade D/);
  assert.match(html, /a\.js:3/);
});
