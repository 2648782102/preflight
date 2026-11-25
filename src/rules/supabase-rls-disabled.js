const CREATE = /create\s+table\s+(?:if\s+not\s+exists\s+)?((?:"?\w+"?\.)?"?\w+"?)/i;
const ENABLE = /alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?((?:"?\w+"?\.)?"?\w+"?)\s+enable\s+row\s+level\s+security/gi;
const bare = (name) => name.replace(/"/g, '').split('.').pop().toLowerCase();

export default {
  id: 'supabase-rls-disabled',
  title: 'Supabase table without row-level security',
  category: 'security',
  severity: 'critical',
  check(project) {
    // Row-level security only protects data exposed through Supabase's public API.
    const usesSupabase = project.has(/(?:^|\/)supabase\//) || /"@supabase\//.test(project.read('package.json'));
    if (!usesSupabase) return [];
    const sqlFiles = project.files.filter((f) => f.endsWith('.sql'));
    if (!sqlFiles.length) return [];
    const enabled = new Set();
    for (const f of sqlFiles) for (const m of project.read(f).matchAll(ENABLE)) enabled.add(bare(m[1]));
    const findings = [];
    for (const file of sqlFiles) {
      project.lines(file).forEach((line, i) => {
        if (/^\s*--/.test(line)) return;
        const m = line.match(CREATE);
        if (m && !enabled.has(bare(m[1]))) {
          const table = bare(m[1]);
          findings.push({
            file,
            line: i + 1,
            message: `Table "${table}" is created without row-level security, so anyone with your public anon key can read and change every row.`,
            fix: `Add \`alter table ${table} enable row level security;\` and write policies for who may select, insert, update and delete.`,
          });
        }
      });
    }
    return findings;
  },
};
