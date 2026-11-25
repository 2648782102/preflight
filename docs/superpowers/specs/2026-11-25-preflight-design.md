# Preflight: design

**One line:** a free, MIT-licensed command that checks whether a vibe-coded app is ready to launch, and shows the answer as a report card worth sharing.

```
npx vibe-preflight
```

## Why

- **For the owner:** qualify for Claude for OSS through the community-builder criterion (20+ outside contributors with merged PRs in 12 months), and have a polished, demo-able project to show people and invite them to contribute.
- **For users:** people shipping AI-built apps leak keys, ship Supabase without row-level security, and forget the basics. Preflight catches that in one command, with a fix for every finding.
- **Why it attracts contributors:** every check is one small, independent rule file with a test fixture. That makes a newcomer's first PR an afternoon's work, and it gives an endless supply of "good first issue" tasks (the model that works for unslop-anything and safe-anything).

## Goals (MVP)

1. One command scans the current folder and prints a terminal **report card**: score 0–100, letter grade, findings grouped by category, each with file:line and a fix.
2. `--html` writes a self-contained, designed `preflight-report.html` that looks good in a screenshot or video.
3. `--json` gives machine output; the exit code is non-zero on critical findings (CI-friendly).
4. 8 starter rules across 3 categories (Security, Reliability, Launch basics).
5. A contributor kit: CONTRIBUTING guide, a rule template, issue and PR templates, CI, and 15 ready-to-post good first issues.
6. A deliberately flawed demo app that scores badly, for the README screenshot and videos.
7. A thin Claude Code plugin: a `/preflight` command that runs the scan and offers to fix findings.

## Non-goals (MVP)

No network calls, no telemetry, no AI calls inside the tool, no automatic fixing in the CLI, no config file beyond inline ignores and `--ignore`, no npm publish or GitHub push without the owner's OK.

## Anti-goals (a failure even if it works)

- **Noisy false positives.** Every rule ships with a "bad" fixture it must flag and a "good" fixture it must not.
- **Scaring without helping.** Every finding carries a concrete fix.
- **Slow.** Typical repos scan in under 2 seconds; `node_modules`, build output and binaries are never read.
- **Hard to contribute to.** No build step, no runtime dependencies, plain JavaScript.

## Decisions

- **Stack:** Node ≥ 20, plain JavaScript (ES modules), **zero runtime dependencies**, tests with `node:test`. Chosen for `npx` speed and the lowest possible contributor friction.
- **Rule contract:** each file `src/rules/<id>.js` default-exports `{ id, title, category, severity, check(project) }`. `check` returns findings `{ file, line, message, fix }`. Rules are loaded automatically from the folder.
- **Severity weights:** critical −15, warning −5, info −1; the score is clamped to 0–100. Grades: A ≥ 90, B ≥ 80, C ≥ 70, D ≥ 50, F < 50.
- **Categories:** `security`, `reliability`, `launch`.
- **Inline ignore:** a line containing `preflight-ignore <rule-id>` silences that rule on that line and the next.
- **Design language:** dark background, one large circular score gauge, grade colour (A green → F red), category bars, findings as cards. Terminal output mirrors the HTML: boxed header, big score, coloured grade. Respects `NO_COLOR`.

## Starter rules

| id | category | severity | flags |
|---|---|---|---|
| `env-file-committed` | security | critical | a `.env*` file (other than `.env.example`) not covered by `.gitignore` |
| `secret-in-client` | security | critical | live secret patterns (`sk_live_`, `sk-ant-`, `sk-proj-`, `AKIA…`, a Supabase `service_role` key) in client-side code |
| `supabase-rls-disabled` | security | critical | a SQL migration that creates a table without enabling row-level security on it |
| `stripe-webhook-unverified` | security | critical | a Stripe webhook handler that never calls `constructEvent` |
| `cors-wildcard` | security | warning | `Access-Control-Allow-Origin: *` or `cors()` with no options |
| `no-error-monitoring` | reliability | info | no Sentry, PostHog, Bugsnag, Rollbar or LogRocket dependency |
| `no-privacy-policy` | launch | warning | no privacy page or route in a project that collects user data |
| `missing-meta-tags` | launch | warning | an `index.html` or root layout without a title, description or Open Graph image |

## Left to the builder

Exact regexes, colour values within the design language, HTML layout details, CLI help copy, and which files count as "client-side" beyond the obvious folders (`src/`, `app/`, `pages/`, `components/`, `public/`), excluding server-only paths (`api/`, `server/`, `supabase/functions/`).
