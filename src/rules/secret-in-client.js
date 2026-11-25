import { isClientFile } from './_client-paths.js';

const SECRETS = [
  { name: 'Stripe secret key', re: /\b[sr]k_live_[0-9A-Za-z]{10,}/ },
  { name: 'Anthropic API key', re: /\bsk-ant-[0-9A-Za-z_-]{20,}/ },
  { name: 'OpenAI API key', re: /\bsk-proj-[0-9A-Za-z_-]{20,}/ },
  { name: 'AWS access key', re: /\bAKIA[0-9A-Z]{16}\b/ },
];

const JWT = /\beyJ[\w-]+\.([\w-]+)\.[\w-]+/g;

/** True if a JWT on this line carries the Supabase service_role claim. */
function hasServiceRoleJwt(line) {
  for (const m of line.matchAll(JWT)) {
    try {
      if (/"role"\s*:\s*"service_role"/.test(Buffer.from(m[1], 'base64url').toString('utf8'))) return true;
    } catch { /* not a JWT */ }
  }
  return false;
}

export default {
  id: 'secret-in-client',
  title: 'Live secret in client-side code',
  category: 'security',
  severity: 'critical',
  check(project) {
    const findings = [];
    for (const file of project.files.filter((f) => isClientFile(f, project.read(f)))) {
      project.lines(file).forEach((line, i) => {
        const hit = SECRETS.find((s) => s.re.test(line)) ?? (hasServiceRoleJwt(line) ? { name: 'Supabase service_role key' } : null);
        if (hit) {
          findings.push({
            file,
            line: i + 1,
            message: `A ${hit.name} is in code that ships to the browser or app, where anyone can read it.`,
            fix: 'Move the key to a server-side environment variable used only by an API route, then rotate it: treat it as leaked.',
          });
        }
      });
    }
    return findings;
  },
};
