function toRegex(pattern) {
  let p = pattern;
  const anchored = p.startsWith('/') || p.slice(0, -1).includes('/');
  p = p.replace(/^\//, '').replace(/\/$/, '');
  const body = p
    .split('**').map((part) => part.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
    .join('.*');
  return new RegExp(anchored ? `^${body}(/.*)?$` : `(^|/)${body}(/.*)?$`);
}

/**
 * True if `file` (a POSIX path relative to the root) is ignored by the root
 * .gitignore lines. Supports *, **, ?, leading / and ! negation; last match wins.
 */
export function isGitignored(file, patterns) {
  let ignored = false;
  for (const raw of patterns) {
    const negate = raw.startsWith('!');
    const pattern = negate ? raw.slice(1) : raw;
    if (pattern && toRegex(pattern).test(file)) ignored = !negate;
  }
  return ignored;
}
