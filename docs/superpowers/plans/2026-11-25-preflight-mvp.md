# Preflight MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a demo-able, contributor-ready MVP of `npx vibe-preflight`: it scans a project, scores its launch readiness, and prints a terminal and HTML report card.

**Architecture:** A file walker builds a `Project` (file list plus lazy reads). Rules in `src/rules/*.js` are loaded automatically, each returning findings. A scorer turns findings into a score and grade, and two renderers (terminal and HTML) present the result. A thin CLI wires it together.

**Tech Stack:** Node ≥ 20, plain JavaScript ES modules, zero runtime dependencies, `node:test` plus `node:assert/strict`.

**Spec:** `docs/superpowers/specs/2026-11-25-preflight-design.md`

## Global Constraints

- `package.json`: `"name": "vibe-preflight"`, `"type": "module"`, `"engines": { "node": ">=20" }`, `"bin": { "vibe-preflight": "bin/preflight.js", "preflight": "bin/preflight.js" }`, `"license": "MIT"`, **no `dependencies`**.
- Test command: `node --test` (every test file is `tests/**/*.test.js`).
- Severity weights: critical 15, warning 5, info 1. Score = clamp(100 − Σ weights, 0, 100). Grades: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 50, F < 50.
- Categories exactly: `security`, `reliability`, `launch`.
- Never read: `node_modules`, `.git`, `dist`, `build`, `.next`, `out`, `coverage`, `.vercel`, files > 1 MB, or binary extensions (images, fonts, archives, media).
- Inline ignore token: `preflight-ignore <rule-id>` silences that rule on the same line and the next line.
- No network access, telemetry or AI calls anywhere in the tool.
- `NO_COLOR` (any value) disables ANSI colour.
- Git identity: `erdellll <326676154+erdellll@users.noreply.github.com>`. Commits end with `Assisted-by: Claude Opus 5.5` and `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Nothing is pushed or published without the owner's OK.

## Review Focus

1. **Running in a folder that isn't an app** (empty folder, or a folder full of binaries): the tool must print a valid card (score 100, "no issues found") and exit 0, not crash. Test in Task 6.
2. **Secrets in server-only code** (`api/`, `server/`, `supabase/functions/`): `secret-in-client` must stay quiet there. A false positive here would discredit the tool. Test in Task 3.
3. **`.env.example` and `.env.sample`:** these must never be flagged as committed secrets. Test in Task 3.
4. **Huge or minified files** (a 5 MB bundle, a one-line 500 KB minified file): skipped or handled without hanging. Test in Task 1 (size cap).
5. **Windows-style paths and CRLF line endings:** line numbers in findings must still be correct, and reported paths use forward slashes. Test in Task 1.

---

### Task 1: Project scaffold and file walker

**Files:**
- Create: `package.json`, `LICENSE` (MIT, "Copyright (c) 2026 erdellll"), `.gitignore` (`node_modules/`, `preflight-report.html`), `src/project.js`
- Test: `test/project.test.js`, fixtures under `test/fixtures/walker/`

**Interfaces:**
- Produces: `async function loadProject(root: string): Promise<Project>`, where `Project = { root: string, files: string[] /* POSIX-style paths relative to root, sorted */, read(file: string): string /* cached, '' if unreadable */, lines(file: string): string[] /* split on /\r?\n/ */, has(pattern: RegExp): boolean /* any file path matches */, gitignore: string[] /* raw lines of root .gitignore, [] if absent */ }`.

- [ ] **Step 1: Write failing tests** in `test/project.test.js`:
  - `walker lists files with posix paths, sorted` → for fixture `walker/basic` (`src/a.js`, `README.md`), `files` deep-equals `['README.md', 'src/a.js']`.
  - `walker skips ignored directories` → files in `node_modules/x.js`, `.next/y.js` and `dist/z.js` are absent.
  - `walker skips binaries and files over 1 MB` → `logo.png` and a generated 1.1 MB `big.js` (created in the test with `writeFileSync` in a temp directory) are absent.
  - `lines splits CRLF correctly` → a file containing `"a\r\nb\r\n"` gives `lines(f)[1] === 'b'`.
  - `gitignore is read` → fixture with `.gitignore` containing `.env` gives `gitignore` that includes `'.env'`.
- [ ] **Step 2:** Run `node --test test/project.test.js`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement `loadProject`** in `src/project.js` with `fs.promises.readdir(..., { withFileTypes: true })` recursion and the skip list from Global Constraints. Check sizes with `stat`. Convert paths with `path.relative(...).split(path.sep).join('/')`.
- [ ] **Step 4:** Run `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: scaffold package and project file walker`.

### Task 2: Rule loader, ignores and scoring

**Files:**
- Create: `src/rules/index.js`, `src/score.js`, `src/run.js`, `src/rules/_template.js` (a commented example rule; files starting with `_` are not loaded)
- Test: `test/score.test.js`, `test/run.test.js`

**Interfaces:**
- Consumes: `loadProject` (Task 1).
- Produces:
  - Rule shape: `{ id: string, title: string, category: 'security'|'reliability'|'launch', severity: 'critical'|'warning'|'info', check(project: Project): Finding[] }`, where `Finding = { file?: string, line?: number, message: string, fix: string }`.
  - `async function loadRules(): Promise<Rule[]>`: imports every `src/rules/*.js` except `index.js` and `_*.js`, sorted by id.
  - `function score(results: Result[]): { score: number, grade: 'A'|'B'|'C'|'D'|'F', counts: { critical: number, warning: number, info: number }, byCategory: Record<category, number /* findings */> }`
  - `async function run(root: string, opts?: { ignore?: string[], rules?: Rule[] /* overrides loadRules(), for tests */ }): Promise<Report>`, where `Result = Finding & { ruleId, title, category, severity }` and `Report = { root, results: Result[], ...score(results), rulesRun: number }`. It drops findings when the rule id is in `opts.ignore` or when `project.lines(file)` has `preflight-ignore <id>` on `line` or `line − 1`.

- [ ] **Step 1: Write failing tests:**
  - `score: no results is 100 / A`.
  - `score: one critical + two warnings is 75 / C` (100 − 15 − 10).
  - `score: clamps at 0` with 10 criticals → `score === 0`, `grade === 'F'`.
  - `grade boundaries` → 90 → A, 89 → B, 50 → D, 49 → F (test through a helper `gradeFor(n)`, also exported).
  - `run honours preflight-ignore on the same and previous line` → with a test-only rule injected through `run(root, { rules: [fakeRule] })` (add an optional `rules` opt for tests), a finding on a line preceded by `// preflight-ignore fake` is dropped.
  - `run honours --ignore` → `run(root, { rules:[fakeRule], ignore:['fake'] })` gives `results.length === 0`.
- [ ] **Step 2:** Run `node --test`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules. `loadRules` uses `readdir` on `new URL('.', import.meta.url)` plus a dynamic `import()`.
- [ ] **Step 4:** Run `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: rule loader, inline ignores and scoring`.

### Task 3: Security rules (4 critical)

**Files:**
- Create: `src/rules/env-file-committed.js`, `src/rules/secret-in-client.js`, `src/rules/supabase-rls-disabled.js`, `src/rules/stripe-webhook-unverified.js`, `src/rules/_client-paths.js` (shared helper, not a rule: the leading `_` keeps the loader from loading it)
- Test: `test/rules/<id>.test.js` for each; fixtures `test/fixtures/<id>/bad/` and `test/fixtures/<id>/good/`

**Interfaces:**
- Consumes: Rule shape and `Project` (Tasks 1–2).
- Produces: `export function isClientFile(path: string): boolean` in `src/rules/_client-paths.js`: true for files under `src/`, `app/`, `pages/`, `components/`, `public/`, `lib/` or the root, with extensions `.js .jsx .ts .tsx .vue .svelte .html .astro`; false under `api/`, `server/`, `supabase/functions/`, `pages/api/`, `app/api/`, `scripts/`, or with `.server.` in the name.
- Every rule test follows one shape: `assert.ok(check(bad).length >= 1)` with the expected `file` and `line`, and `assert.deepEqual(check(good), [])`.

- [ ] **Step 1: Write failing tests** with these fixture contents:
  - `env-file-committed`: bad has `.env` with `API_KEY=x` and no `.gitignore` → finding `file: '.env'`. Good has the same `.env` plus `.gitignore` with `.env*`, and `.env.example` → `[]`. Also: `.env.local` is listed by `.gitignore` line `.env.local` → quiet.
  - `secret-in-client`: bad `src/lib/stripe.ts` line 2 `const key = "sk_live_51H..."` → `{ file: 'src/lib/stripe.ts', line: 2 }`. Good: the same string in `api/checkout.ts` and in `supabase/functions/pay/index.ts` → `[]`; `pk_live_` in `src/` → `[]` (publishable keys are meant to be public).
  - `supabase-rls-disabled`: bad `supabase/migrations/001_init.sql` creates `profiles` with no `enable row level security` → `line` of the `create table`. Good: the same plus `alter table profiles enable row level security;` (case-insensitive) → `[]`.
  - `stripe-webhook-unverified`: bad `app/api/stripe/webhook/route.ts` reads the request JSON and switches on `event.type` with no `constructEvent` → finding on that file. Good: it calls `stripe.webhooks.constructEvent(` → `[]`. A file that is not a webhook (no `webhook` in the path and no `checkout.session.completed`) → `[]`.
- [ ] **Step 2:** Run `node --test test/rules`. Expected: FAIL.
- [ ] **Step 3: Implement** each rule (id, title, category `security`, severity `critical`, a `fix` string naming the concrete remedy, for example "Add `.env*` to .gitignore, rotate the leaked keys, and remove the file with `git rm --cached .env`"). Secret patterns: `sk_live_[0-9A-Za-z]{10,}`, `sk-ant-[0-9A-Za-z_-]{20,}`, `sk-proj-[0-9A-Za-z_-]{20,}`, `AKIA[0-9A-Z]{16}`, and a JWT whose line also contains `service_role`.
- [ ] **Step 4:** Run `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add four critical security rules`.

### Task 4: Remaining starter rules

**Files:**
- Create: `src/rules/cors-wildcard.js` (security, warning), `src/rules/no-error-monitoring.js` (reliability, info), `src/rules/no-privacy-policy.js` (launch, warning), `src/rules/missing-meta-tags.js` (launch, warning)
- Test: `test/rules/<id>.test.js` with good and bad fixtures, same shape as Task 3

- [ ] **Step 1: Write failing tests:**
  - `cors-wildcard`: bad `server.js` has `app.use(cors())` → flagged; bad `api/x.ts` has `'Access-Control-Allow-Origin': '*'` → flagged. Good: `cors({ origin: 'https://myapp.com' })` → `[]`.
  - `no-error-monitoring`: bad `package.json` with only `react` → one finding with `file: 'package.json'`. Good: it has `@sentry/nextjs` → `[]`. No `package.json` at all → `[]` (not a JS app).
  - `no-privacy-policy`: bad has an auth or signup signal (`supabase.auth`, `signUp`, `createUserWithEmailAndPassword`, or an email `<input type="email"`) and no file path matching `/privacy/i` → one project-level finding. Good: it has `app/privacy/page.tsx` → `[]`. No auth signal at all → `[]`.
  - `missing-meta-tags`: bad `index.html` with `<title>` but no `name="description"` and no `og:image` → findings naming the missing tags. Good: all three present → `[]`. Next.js `app/layout.tsx` exporting `metadata` with `title`, `description` and `openGraph` → `[]`.
- [ ] **Step 2:** Run `node --test test/rules`. Expected: FAIL.
- [ ] **Step 3: Implement** the four rules.
- [ ] **Step 4:** Run `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: add CORS, monitoring, privacy and meta-tag rules`.

### Task 5: Terminal report card

**Files:**
- Create: `src/report/terminal.js`, `src/report/colors.js`
- Test: `test/report-terminal.test.js`

**Interfaces:**
- Consumes: `Report` (Task 2).
- Produces: `function renderTerminal(report: Report, opts?: { color?: boolean, width?: number }): string`.

Target look (with colours: grade letter and score coloured A/B green, C yellow, D/F red; criticals red, warnings yellow, info dim):

```
╭──────────────────────────────────────────────╮
│  PREFLIGHT                    vibe-preflight │
│                                              │
│        62 / 100     Grade D                  │
│        ███████████████░░░░░░░░░              │
│  3 critical · 2 warnings · 1 info · 8 rules  │
╰──────────────────────────────────────────────╯

SECURITY
 ✖ CRITICAL  Live secret in client code
   src/lib/stripe.ts:2
   → Move the key to a server route and rotate it.
...
Run with --html for a shareable report card.
```

- [ ] **Step 1: Write failing tests:**
  - `color false emits no ANSI codes` → output does not match `/\x1b\[/`.
  - `shows score, grade and counts` → the output for a fixture report (score 62, grade D, 3/2/1) includes `62 / 100`, `Grade D` and `3 critical · 2 warnings · 1 info`.
  - `groups findings under category headings in order security, reliability, launch`, checked by index order of the headings.
  - `clean report says no issues` → a report with zero results includes `No issues found` and `Grade A`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Implement** with box-drawing characters and a 24-cell bar (filled cells = round(score/100 × 24)). Colour defaults to `process.stdout.isTTY && !process.env.NO_COLOR`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat: terminal report card`.

### Task 6: HTML report card and CLI

**Files:**
- Create: `src/report/html.js`, `bin/preflight.js`, `src/cli.js`
- Test: `test/report-html.test.js`, `test/cli.test.js`

**Interfaces:**
- Consumes: `run` (Task 2), `renderTerminal` (Task 5).
- Produces: `function renderHtml(report: Report): string` (one self-contained file: inline CSS, inline SVG gauge, no external requests), and `async function main(argv: string[], io: { stdout, stderr, cwd }): Promise<number /* exit code */>` in `src/cli.js`. `bin/preflight.js` is `#!/usr/bin/env node` and calls `process.exit(await main(process.argv.slice(2), …))`.

CLI contract: `vibe-preflight [path] [--html [file]] [--json] [--ignore id,id] [--fail-on critical|warning|never] [--help] [--version]`. Default path is `.`, default HTML file is `preflight-report.html`, default `--fail-on` is `critical`. Exit 1 when any finding is at or above the fail-on level; otherwise 0. Exit 2 on a bad argument or a missing path.

HTML design: dark background `#0b0d12`, card max-width 880px, a circular SVG gauge (stroke coloured by grade) with the score in the middle, the grade letter, three category bars, then finding cards (severity pill, title, `file:line` in monospace, fix). A footer line reads "Generated by vibe-preflight · MIT · github.com/erdellll/preflight".

- [ ] **Step 1: Write failing tests:**
  - `html is self-contained` → no `<script src=`, `<link rel="stylesheet"` or `http` inside `src=`/`href=` except the footer GitHub link.
  - `html escapes finding text` → a finding message `<img onerror=x>` appears as `&lt;img onerror=x&gt;`.
  - `cli --json prints parseable report` → `JSON.parse(stdout).score` is a number.
  - `cli exits 1 on critical by default, 0 with --fail-on never` → using the `test/fixtures/secret-in-client/bad` folder.
  - `cli on an empty folder prints a clean card and exits 0` (Review Focus 1).
  - `cli exits 2 for a missing path`.
  - `cli --html writes the file` → in a temp directory, the file exists and starts with `<!doctype html>`.
- [ ] **Step 2:** Run `node --test`. Expected: FAIL.
- [ ] **Step 3: Implement** `renderHtml`, `main` and the bin. Parse arguments with `node:util` `parseArgs`.
- [ ] **Step 4:** Run `node --test`, then `node bin/preflight.js test/fixtures/secret-in-client/bad`, and check the card renders. Expected: tests PASS, card prints, exit code 1.
- [ ] **Step 5: Commit** `feat: html report card and cli`.

### Task 7: Demo app, README and screenshots

**Files:**
- Create: `examples/vibe-app/` (a tiny fake app that triggers at least 6 of the 8 rules: `.env` with no `.gitignore`, `src/lib/stripe.ts` with an obviously fake `sk_live_` key, `supabase/migrations/001_init.sql` without RLS, `app/api/stripe/webhook/route.ts` with no verification, `server.js` with `cors()`, `index.html` with no meta tags, `package.json` with no monitoring), `README.md`, `docs/assets/report-card.png` (screenshot of the HTML report for the demo app), `docs/rules.md`
- Test: `test/readme.test.js`

- [ ] **Step 1: Write failing tests:**
  - `readme rule count matches the rules folder` → README contains `${rules.length} checks`.
  - `docs/rules.md lists every rule id` → each `rule.id` appears in the file.
  - `demo app scores below 50` → `run('examples/vibe-app')` gives `score < 50`.
- [ ] **Step 2:** Run the tests. Expected: FAIL.
- [ ] **Step 3: Write** the demo app, `docs/rules.md` (a table of id, category, severity and what it flags), and the README. The README covers: a one-line pitch ("Is your vibe-coded app ready to launch? Find out in one command."), the screenshot, `npx vibe-preflight`, what it checks (with the count), flags, CI usage, "Add a check in 10 minutes" linking CONTRIBUTING, badges (MIT, node ≥ 20, PRs welcome), and the "Not a security audit" disclaimer. Every fake secret in the demo app must be obviously fake (`sk_live_FAKE_DEMO_KEY_DO_NOT_USE_000000`) and carry `preflight` context so secret scanners won't mistake it for a real key.
- [ ] **Step 4:** Generate the screenshot: `node bin/preflight.js examples/vibe-app --html /tmp/demo.html --fail-on never`, open it in the built-in browser and save a screenshot to `docs/assets/report-card.png`. Run `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `docs: readme, rule docs and demo app`.

### Task 8: Contributor kit and CI

**Files:**
- Create: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, contact: GitHub issues), `.github/ISSUE_TEMPLATE/new-check.yml`, `.github/ISSUE_TEMPLATE/false-positive.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md`, `.github/workflows/ci.yml` (Node 20 and 22 matrix: `node --test`), `docs/seed-issues.md`
- Test: `test/contributing.test.js`

- [ ] **Step 1: Write failing tests:**
  - `template rule passes the rule contract` → importing `src/rules/_template.js` default export has `id`, `title`, a valid `category` and `severity`, and a `check` function.
  - `every rule has good and bad fixtures` → for each loaded rule, `test/fixtures/<id>/good` and `test/fixtures/<id>/bad` exist.
  - `every rule finding has a fix` → run each rule on its bad fixture; every finding has a non-empty `fix`.
- [ ] **Step 2:** Run the tests. Expected: FAIL only where fixtures or templates are missing.
- [ ] **Step 3: Write** CONTRIBUTING as "Add a check in 3 steps" (copy `_template.js`, add good and bad fixtures, run `node --test`), plus the rules every check must meet: a fix on every finding, no network access, quiet on its good fixture. Write the issue and PR templates. Write `docs/seed-issues.md`: 15 issues ready to post, each with a title, labels (`good first issue`, `new check`), the exact rule id, what it should flag, a bad and a good example, and "done when" criteria, in the style of unslop-anything. Candidates: `firebase-rules-open`, `next-public-secret`, `vite-env-secret-prefix`, `missing-robots-txt`, `missing-favicon`, `console-log-secrets`, `debug-mode-production` (Django `DEBUG=True`, Flask `debug=True`), `jwt-secret-weak`, `no-rate-limit-auth-route`, `sql-string-concat`, `missing-404-page`, `no-terms-of-service`, `open-redirect`, `localhost-url-in-prod-config`, `missing-lockfile`.
- [ ] **Step 4:** Run `node --test`. Expected: PASS.
- [ ] **Step 5: Commit** `docs: contributor kit, templates, CI and seed issues`.

### Task 9: Claude Code plugin

**Files:**
- Create: `.claude-plugin/plugin.json` (name `preflight`, description, version `0.1.0`, author `erdellll`, license MIT), `commands/preflight.md` (a `/preflight` command: run `npx vibe-preflight --json --fail-on never` in the project, summarise the score, then offer to fix critical findings one by one, asking before each change)
- Test: `test/plugin.test.js`

- [ ] **Step 1: Write failing test** `plugin manifest is valid` → `plugin.json` parses, `name === 'preflight'`, and `commands/preflight.md` exists and mentions `vibe-preflight --json`.
- [ ] **Step 2:** Run it. Expected: FAIL.
- [ ] **Step 3: Write** both files. Add a README section, "Use it inside Claude Code", with install steps.
- [ ] **Step 4:** Run `node --test`. Expected: PASS. Manual check: `node bin/preflight.js examples/vibe-app --json --fail-on never | head -c 200` prints JSON.
- [ ] **Step 5: Commit** `feat: claude code plugin with /preflight command`.

---

**After Task 9, stop.** Show the owner the README, the screenshot and the demo run. Creating the GitHub repo, pushing, publishing to npm and posting the seed issues each need the owner's explicit OK.
