import { readdir, stat } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Directories that are never scanned: dependencies, VCS data and build output. */
export const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', '.vercel',
  '.svelte-kit', '.nuxt', '.turbo', '.cache', '.expo', 'Pods', 'DerivedData', '.superpowers',
]);

/** Files larger than this are skipped (bundles, dumps, generated code). */
export const MAX_FILE_BYTES = 1024 * 1024;

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.icns', '.bmp', '.tiff', '.psd',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.jar',
  '.mp3', '.mp4', '.mov', '.wav', '.ogg', '.webm', '.m4a', '.avi',
  '.pdf', '.exe', '.dll', '.so', '.dylib', '.bin', '.wasm', '.sqlite', '.db', '.lockb',
]);

async function walk(root, dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) await walk(root, full, out);
    } else if (entry.isFile()) {
      if (BINARY_EXT.has(path.extname(entry.name).toLowerCase())) continue;
      try {
        if ((await stat(full)).size > MAX_FILE_BYTES) continue;
      } catch {
        continue;
      }
      out.push(path.relative(root, full).split(path.sep).join('/'));
    }
  }
}

/**
 * Builds the view of a project that every rule receives.
 * @param {string} root
 */
export async function loadProject(root) {
  const files = [];
  await walk(root, root, files);
  files.sort();
  const cache = new Map();
  const read = (file) => {
    if (!cache.has(file)) {
      let text = '';
      try {
        text = readFileSync(path.join(root, file), 'utf8');
      } catch {
        text = '';
      }
      cache.set(file, text);
    }
    return cache.get(file);
  };
  const gitignore = files.includes('.gitignore')
    ? read('.gitignore').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    : [];
  return {
    root,
    files,
    read,
    lines: (file) => read(file).split(/\r?\n/),
    has: (pattern) => files.some((f) => pattern.test(f)),
    gitignore,
  };
}
