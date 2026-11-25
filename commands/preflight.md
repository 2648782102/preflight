---
description: Check whether this app is ready to launch and help fix what's blocking it
---

Run Preflight on the current project and help the user fix what it finds.

1. Run `node "${CLAUDE_PLUGIN_ROOT}/bin/preflight.js" --json --fail-on never` in the project root and parse the JSON report. If that path is unavailable, fall back to `npx -y vibe-preflight --json --fail-on never`.
2. Summarise it in a few lines: the score out of 100, the grade, and the number of critical issues, warnings and info items.
3. List the findings grouped by category, critical first, each with its `file:line` and the fix Preflight suggests.
4. Offer to fix the critical findings one at a time. Before each change, say which file you'll edit and what you'll do, and wait for the user's OK. Never print a secret value; if a key was exposed, remind the user to rotate it with the provider, since removing it from the code is not enough.
5. After the fixes, run the same command without `--json` and show the new score.

If the user asks for a shareable report, run the same command with `--html` and tell them where `preflight-report.html` was written.
