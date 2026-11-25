const CODES = { bold: 1, dim: 2, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35, cyan: 36, gray: 90 };

/** Returns a palette of colour functions; all are identity when `enabled` is false. */
export function palette(enabled) {
  const p = {};
  for (const [name, code] of Object.entries(CODES)) p[name] = (s) => (enabled ? `\x1b[${code}m${s}\x1b[0m` : String(s));
  return p;
}

export const gradeColor = (grade) => ({ A: 'green', B: 'green', C: 'yellow', D: 'red', F: 'red' }[grade]);
export const severityColor = (sev) => ({ critical: 'red', warning: 'yellow', info: 'gray' }[sev]);
export const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
