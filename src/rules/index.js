import { readdir } from 'node:fs/promises';

/**
 * Loads every rule in this folder. Files named index.js or starting with
 * "_" (helpers and the template) are not rules.
 */
export async function loadRules() {
  const dir = new URL('.', import.meta.url);
  const names = (await readdir(dir)).filter((n) => n.endsWith('.js') && n !== 'index.js' && !n.startsWith('_'));
  const rules = await Promise.all(names.map(async (n) => (await import(new URL(n, dir))).default));
  return rules.filter((r) => r && typeof r.check === 'function').sort((a, b) => a.id.localeCompare(b.id));
}
