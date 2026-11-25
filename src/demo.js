import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fake secrets are assembled at runtime instead of being committed, so the repo
 * never contains strings that look like real keys to secret scanners.
 */
export const PLACEHOLDERS = {
  __STRIPE_LIVE__: ['sk', 'live', '51HdemoFAKEkey'].join('_') + '0'.repeat(20),
  __ANTHROPIC_KEY__: ['sk', 'ant', 'api03'].join('-') + '-FAKEdemoKEY' + '0'.repeat(20),
  __OPENAI_KEY__: ['sk', 'proj'].join('-') + '-FAKEdemoKEY' + '0'.repeat(20),
  __AWS_KEY__: 'AKIA' + 'FAKEDEMO00000000',
  __SERVICE_ROLE_JWT__: 'eyJ' + 'hbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.FAKEsignature',
};

/** Replaces every placeholder in every file under `dir`, in place. */
export function fillPlaceholders(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) fillPlaceholders(full);
    else {
      let text = readFileSync(full, 'utf8');
      for (const [k, v] of Object.entries(PLACEHOLDERS)) text = text.split(k).join(v);
      writeFileSync(full, text);
    }
  }
}

/** Copies a template folder to a fresh temp dir with placeholders filled. */
export function materialize(src, label = 'demo') {
  const dest = mkdtempSync(path.join(tmpdir(), `preflight-${label}-`));
  cpSync(src, dest, { recursive: true });
  fillPlaceholders(dest);
  return dest;
}

/** Builds the deliberately broken demo app and returns its folder. */
export function buildDemo() {
  return materialize(fileURLToPath(new URL('../examples/vibe-app/', import.meta.url)), 'demo');
}
