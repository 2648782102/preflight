import { parseArgs } from 'node:util';
import { existsSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { run } from './run.js';
import { renderTerminal } from './report/terminal.js';
import { renderHtml } from './report/html.js';
import { buildDemo } from './demo.js';

const LEVELS = { critical: ['critical'], warning: ['critical', 'warning'], never: [] };

/** Levenshtein distance, for "did you mean" on a mistyped check id. */
const distance = (a, b) => {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length];
};

/**
 * The id closest to `typed`, or null when nothing is close enough to be worth suggesting.
 * Half the longer id's length keeps a wildly different id from producing a silly guess.
 */
const closestId = (typed, ids) => {
  let best = null;
  let bestDistance = Infinity;
  for (const id of ids) {
    const d = distance(typed, id);
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  const limit = Math.max(2, Math.floor(Math.max(typed.length, (best ?? '').length) / 2));
  return bestDistance <= limit ? best : null;
};

const HELP = `vibe-preflight: is your vibe-coded app ready to launch?

Usage
  npx vibe-preflight [path] [options]

Options
  --html [file]        also write a shareable report card (default: preflight-report.html)
  --json               print the report as JSON instead of the card
  --demo               scan a deliberately broken demo app (fake secrets) to see Preflight in action
  --ignore <ids>       comma-separated check ids to skip
  --fail-on <level>    critical (default) | warning | never; sets the exit code for CI
  -v, --version        print the version
  -h, --help           show this help

Silence one finding with a comment on the line or the line above:
  // preflight-ignore <check-id>
`;

function version() {
  return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
}

/**
 * Runs the CLI. Returns the exit code instead of exiting, so it can be tested.
 * @param {string[]} argv
 * @param {{ cwd: string, stdout: { write(s: string): void }, stderr: { write(s: string): void } }} io
 */
export async function main(argv, io) {
  let args;
  try {
    // --html takes an optional file, which parseArgs can't express: normalise it first.
    const norm = [];
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--html') {
        const next = argv[i + 1];
        norm.push('--html', next && !next.startsWith('-') && /\.html?$/i.test(next) ? argv[++i] : 'preflight-report.html');
      } else norm.push(argv[i]);
    }
    args = parseArgs({
      args: norm,
      allowPositionals: true,
      options: {
        html: { type: 'string' },
        json: { type: 'boolean' },
        demo: { type: 'boolean' },
        ignore: { type: 'string' },
        'fail-on': { type: 'string', default: 'critical' },
        version: { type: 'boolean', short: 'v' },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch (err) {
    io.stderr.write(`${err.message}\n\nRun with --help for usage.\n`);
    return 2;
  }
  const { values, positionals } = args;
  if (values.help) { io.stdout.write(HELP); return 0; }
  if (values.version) { io.stdout.write(`${version()}\n`); return 0; }
  if (!LEVELS[values['fail-on']]) {
    io.stderr.write(`--fail-on must be critical, warning or never (got "${values['fail-on']}").\n`);
    return 2;
  }
  const root = values.demo ? buildDemo() : path.resolve(io.cwd, positionals[0] ?? '.');
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    io.stderr.write(`Folder not found: ${root}\n`);
    return 2;
  }

  const report = await run(root, { ignore: values.ignore ? values.ignore.split(',').map((s) => s.trim()).filter(Boolean) : [] });

  // A mistyped --ignore switches off nothing, which looks exactly like the check passing (#19).
  if (report.unknownIgnore?.length) {
    const { loadRules } = await import('./rules/index.js');
    const ids = (await loadRules()).map((r) => r.id);
    for (const id of report.unknownIgnore) {
      const near = closestId(id, ids);
      io.stderr.write(
        `--ignore: no check has the id "${id}"${near ? ` (did you mean "${near}"?)` : ''}. ` +
          `It ignored nothing; run --help or see docs/rules.md for the ids.\n`,
      );
    }
  }

  if (values.demo && !values.json) io.stdout.write('Scanning the Preflight demo app (deliberately broken, every secret is fake)...\n\n');
  if (values.json) io.stdout.write(JSON.stringify(report, null, 2) + '\n');
  else io.stdout.write(renderTerminal(report));

  if (values.html) {
    const file = path.resolve(io.cwd, values.html);
    writeFileSync(file, renderHtml(report));
    if (!values.json) io.stdout.write(`Report card written to ${path.relative(io.cwd, file) || file}\n`);
  }

  const failing = LEVELS[values['fail-on']];
  return report.results.some((r) => failing.includes(r.severity)) ? 1 : 0;
}
