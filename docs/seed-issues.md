# Seed issues

Ready-to-post `good first issue` tasks. Each one is a new check: one file in `src/rules/`, plus a `bad` and a `good` fixture. Post them once the repo is public. Labels: `good first issue`, `new check`.

Every issue ends with the same "How to build it" block:

> Copy `src/rules/_template.js` to `src/rules/<id>.js`, add `tests/fixtures/<id>/bad/` and `tests/fixtures/<id>/good/`, add a row to `docs/rules.md`, bump the README check count, and run `node --test`. See [CONTRIBUTING.md](../CONTRIBUTING.md).

---

## New check: `firebase-rules-open` (security, critical)

**Flags:** `firestore.rules` or `database.rules.json` that let anyone read or write, such as `allow read, write: if true;` or `".read": true`.
**Bad:** `firestore.rules` containing `allow read, write: if true;`
**Good:** `allow read: if request.auth != null;`
**Done when:** both rule files are checked, the finding points at the line, and the fix says to require `request.auth` and scope rules per document.

## New check: `next-public-secret` (security, critical)

**Flags:** a `NEXT_PUBLIC_` environment variable whose name says it's secret (`NEXT_PUBLIC_*SECRET*`, `*SERVICE_ROLE*`, `*PRIVATE*`, `*STRIPE_SECRET*`) in `.env*` files or code. Anything prefixed `NEXT_PUBLIC_` ships to the browser.
**Bad:** `NEXT_PUBLIC_STRIPE_SECRET_KEY=...` in `.env.local`
**Good:** `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
**Done when:** `.env.example` is checked too (names matter even without values), and anon or publishable keys stay quiet.

## New check: `vite-env-secret-prefix` (security, critical)

**Flags:** the same problem for Vite (`VITE_*SECRET*`, `VITE_*SERVICE_ROLE*`), Expo (`EXPO_PUBLIC_*SECRET*`) and Create React App (`REACT_APP_*SECRET*`).
**Bad:** `VITE_OPENAI_SECRET=...`
**Good:** `VITE_API_URL=...`
**Done when:** all three prefixes are covered by tests.

## New check: `debug-mode-production` (security, warning)

**Flags:** debug mode left on in server code: Django `DEBUG = True` in `settings.py`, Flask `app.run(debug=True)`, Express `app.set('env', 'development')`.
**Bad:** `settings.py` with `DEBUG = True`
**Good:** `DEBUG = os.environ.get("DEBUG") == "1"`
**Done when:** files under `tests/` and `local_settings.py` stay quiet.

## New check: `console-log-secrets` (security, warning)

**Flags:** `console.log` or `print` calls that log a variable named like a secret (`password`, `token`, `apiKey`, `secret`, `authorization`).
**Bad:** `console.log('token', token)`
**Good:** `console.log('token refreshed')`
**Done when:** only the logged arguments are matched, not the message string.

## New check: `jwt-secret-weak` (security, critical)

**Flags:** `jwt.sign(...)` or `jwt.verify(...)` called with a short hard-coded string secret (under 32 characters) such as `'secret'` or `'changeme'`.
**Bad:** `jwt.sign(payload, 'secret')`
**Good:** `jwt.sign(payload, process.env.JWT_SECRET)`
**Done when:** environment-variable secrets stay quiet.

## New check: `sql-string-concat` (security, warning)

**Flags:** SQL built with string concatenation or template literals containing user input: `` `SELECT * FROM users WHERE id = ${req.params.id}` ``.
**Bad:** a template literal with `SELECT`/`INSERT`/`UPDATE`/`DELETE` plus `${req.`
**Good:** `db.query('SELECT * FROM users WHERE id = $1', [id])`
**Done when:** tagged templates from safe libraries (`sql\`...\``) stay quiet.

## New check: `open-redirect` (security, warning)

**Flags:** `res.redirect(req.query.x)` or `redirect(searchParams.get('next'))` with no allow-list check.
**Bad:** `res.redirect(req.query.returnTo)`
**Good:** a redirect to a fixed path
**Done when:** the fix explains allowing only relative paths or a known host list.

## New check: `no-rate-limit-auth-route` (reliability, warning)

**Flags:** an Express or Next.js login, sign-up or password-reset route in a project with no rate-limiting dependency (`express-rate-limit`, `@upstash/ratelimit`, `rate-limiter-flexible`).
**Bad:** `app/api/login/route.ts` with no limiter in `package.json`
**Good:** the same with `@upstash/ratelimit`
**Done when:** projects without auth routes stay quiet.

## New check: `localhost-url-in-prod-config` (reliability, warning)

**Flags:** `http://localhost` or `127.0.0.1` in client code or production config (`.env.production`, `vercel.json`, `app.json`).
**Bad:** `const API = 'http://localhost:3000'` in `src/api.ts`
**Good:** `const API = process.env.NEXT_PUBLIC_API_URL`
**Done when:** test files, `.env.development` and `README` files stay quiet.

## New check: `missing-lockfile` (reliability, info)

**Flags:** a `package.json` with dependencies but no `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock` or `bun.lockb`, so installs aren't reproducible.
**Bad:** `package.json` only
**Good:** `package.json` plus `pnpm-lock.yaml`
**Done when:** workspaces with a lockfile at the root stay quiet.

## New check: `missing-robots-txt` (launch, info)

**Flags:** a website project (has `index.html`, `app/layout.*` or `pages/_app.*`) with no `robots.txt` in `public/` and no `app/robots.ts`.
**Bad:** a Vite app with no `public/robots.txt`
**Good:** a Next.js app with `app/robots.ts`
**Done when:** mobile-only and backend-only projects stay quiet.

## New check: `missing-favicon` (launch, info)

**Flags:** a website project with no `favicon.ico`, `icon.png`, `app/icon.*` or `<link rel="icon">`.
**Bad:** `index.html` with no icon link and no `public/favicon.ico`
**Good:** `public/favicon.ico`
**Done when:** the default Vite and Next.js favicon locations are all recognised.

## New check: `missing-404-page` (launch, info)

**Flags:** a Next.js app without `app/not-found.*` or `pages/404.*`, or an Astro or SvelteKit app without its 404 page.
**Bad:** `app/layout.tsx` with no `app/not-found.tsx`
**Good:** `app/not-found.tsx`
**Done when:** non-web projects stay quiet.

## New check: `no-terms-of-service` (launch, warning)

**Flags:** an app that takes payments (a Stripe, Lemon Squeezy, Paddle or RevenueCat dependency) with no `terms` page or route.
**Bad:** `stripe` in `package.json` and no file path matching `/terms/i`
**Good:** `app/terms/page.tsx`
**Done when:** apps without payments stay quiet, mirroring `no-privacy-policy`.
