import { cpSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadProject } from '../src/project.js';

const FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url));

/**
 * Fake secrets are assembled here instead of being committed, so the repo never
 * contains strings that look like real keys to GitHub secret scanning.
 */
export const PLACEHOLDERS = {
  __STRIPE_LIVE__: ['sk', 'live', '51HdemoFAKEkey'].join('_') + '0'.repeat(20),
  __ANTHROPIC_KEY__: ['sk', 'ant', 'api03'].join('-') + '-FAKEdemoKEY' + '0'.repeat(20),
  __OPENAI_KEY__: ['sk', 'proj'].join('-') + '-FAKEdemoKEY' + '0'.repeat(20),
  __AWS_KEY__: 'AKIA' + 'FAKEDEMO00000000',
  __SERVICE_ROLE_JWT__: 'eyJ' + 'hbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.FAKEsignature',
};

function fill(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) fill(full);
    else {
      let text = readFileSync(full, 'utf8');
      for (const [k, v] of Object.entries(PLACEHOLDERS)) text = text.split(k).join(v);
      writeFileSync(full, text);
    }
  }
}

/** Copies tests/fixtures/<name>/<variant> to a temp dir with placeholders filled. */
export function fixtureDir(name, variant) {
  const dest = mkdtempSync(path.join(tmpdir(), `preflight-${name}-`));
  cpSync(path.join(FIXTURES, name, variant), dest, { recursive: true });
  fill(dest);
  return dest;
}

export const fixtureProject = (name, variant) => loadProject(fixtureDir(name, variant));
