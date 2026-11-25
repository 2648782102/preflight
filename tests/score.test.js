import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, gradeFor } from '../src/score.js';

const r = (severity, category = 'security') => ({ ruleId: 'x', title: 'x', category, severity, message: 'm', fix: 'f' });

test('score: no results is 100 / A', () => {
  const s = score([]);
  assert.equal(s.score, 100);
  assert.equal(s.grade, 'A');
  assert.deepEqual(s.counts, { critical: 0, warning: 0, info: 0 });
});

test('score: one critical + two warnings is 75 / C', () => {
  const s = score([r('critical'), r('warning', 'launch'), r('warning', 'launch')]);
  assert.equal(s.score, 75);
  assert.equal(s.grade, 'C');
  assert.deepEqual(s.counts, { critical: 1, warning: 2, info: 0 });
  assert.deepEqual(s.byCategory, { security: 1, reliability: 0, launch: 2 });
});

test('score: clamps at 0', () => {
  const s = score(Array.from({ length: 10 }, () => r('critical')));
  assert.equal(s.score, 0);
  assert.equal(s.grade, 'F');
});

test('grade boundaries', () => {
  assert.equal(gradeFor(90), 'A');
  assert.equal(gradeFor(89), 'B');
  assert.equal(gradeFor(80), 'B');
  assert.equal(gradeFor(70), 'C');
  assert.equal(gradeFor(50), 'D');
  assert.equal(gradeFor(49), 'F');
});
