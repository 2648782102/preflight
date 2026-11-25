function toRegex(pattern) {
  let p = pattern;
  const anchored = p.startsWith('/') || (p.slice(0, -1).includes('/') && !p.startsWith('**/'));
  p = p.replace(/^\//, '').replace(/\/$/, '').replace(/^\*\*\//, '');
  const body = p
    .split('**').map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
    .join('.*');
  return new RegExp(anchored ? `^${body}(/.*)?$` : `(^|/)${body}(/.*)?$`);
}

/**
 * Applies .gitignore lines to `file` (a POSIX path relative to that .gitignore's
 * folder). Supports *, **, ?, leading / and ! negation; the last match wins.
 * Returns true/false, or `fallback` when no line matches.
 */
export function isGitignored(file, patterns, fallback = false) {
  let ignored = fallback;
  for (const raw of patterns) {
    const negate = raw.startsWith('!');
    const pattern = negate ? raw.slice(1) : raw;
    if (pattern && toRegex(pattern).test(file)) ignored = !negate;
  }
  return ignored;
}
