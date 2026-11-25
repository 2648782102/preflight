/** Points lost per finding, by severity. */
export const WEIGHTS = { critical: 15, warning: 5, info: 1 };

export const CATEGORIES = ['security', 'reliability', 'launch'];

/** @param {number} n score from 0 to 100 */
export function gradeFor(n) {
  if (n >= 90) return 'A';
  if (n >= 80) return 'B';
  if (n >= 70) return 'C';
  if (n >= 50) return 'D';
  return 'F';
}

/**
 * Turns findings into a score, grade and counts.
 * @param {Array<{severity: 'critical'|'warning'|'info', category: string}>} results
 */
export function score(results) {
  const counts = { critical: 0, warning: 0, info: 0 };
  const byCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  let lost = 0;
  for (const r of results) {
    counts[r.severity] += 1;
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    lost += WEIGHTS[r.severity] ?? 0;
  }
  const value = Math.max(0, Math.min(100, 100 - lost));
  return { score: value, grade: gradeFor(value), counts, byCategory };
}
