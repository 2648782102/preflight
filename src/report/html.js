import { CATEGORIES } from '../score.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/** Escapes text, then turns `code` spans into inline code. */
const rich = (s) => esc(s).replace(/`([^`]+)`/g, '<code class="inline">$1</code>');

const GRADE_COLOR = { A: '#34d399', B: '#a3e635', C: '#fbbf24', D: '#fb923c', F: '#f87171' };
const SEVERITY_COLOR = { critical: '#f87171', warning: '#fbbf24', info: '#94a3b8' };
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
const CATEGORY_LABEL = { security: 'Security', reliability: 'Reliability', launch: 'Launch basics' };
const VERDICT = {
  A: 'Cleared for takeoff.',
  B: 'Nearly there. A few things to tidy.',
  C: 'Fix the red items before you launch.',
  D: 'Not ready to launch yet.',
  F: 'Grounded. Fix the critical issues first.',
};

function gauge(score, color) {
  const r = 70;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - score / 100);
  return `<svg class="gauge" viewBox="0 0 180 180" role="img" aria-label="Score ${score} out of 100">
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="#1f2430" stroke-width="14"/>
  <circle cx="90" cy="90" r="${r}" fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
    stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 90 90)"/>
  <text x="90" y="92" text-anchor="middle" class="gauge-score" fill="${color}" style="fill:${color}">${score}</text>
  <text x="90" y="118" text-anchor="middle" class="gauge-out">/ 100</text>
</svg>`;
}

function categoryBars(report) {
  const max = Math.max(1, ...CATEGORIES.map((c) => report.byCategory[c] ?? 0));
  return CATEGORIES.map((c) => {
    const n = report.byCategory[c] ?? 0;
    const width = n === 0 ? 100 : Math.max(8, Math.round((n / max) * 100));
    const color = n === 0 ? '#34d399' : report.results.some((r) => r.category === c && r.severity === 'critical') ? '#f87171' : '#fbbf24';
    return `<div class="bar"><span class="bar-label">${CATEGORY_LABEL[c]}</span><span class="bar-track"><span class="bar-fill" style="width:${width}%;background:${color}"></span></span><span class="bar-count">${n === 0 ? '✓' : n}</span></div>`;
  }).join('\n');
}

function findingCards(report) {
  if (!report.results.length) return '<div class="clean">No issues found. Ready for takeoff.</div>';
  return CATEGORIES.map((c) => {
    const items = report.results.filter((r) => r.category === c).sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    if (!items.length) return '';
    return `<h2>${CATEGORY_LABEL[c]}</h2>\n` + items.map((r) => `<article class="finding" style="--sev:${SEVERITY_COLOR[r.severity]}">
  <div class="finding-head"><span class="pill">${esc(r.severity)}</span><h3>${esc(r.title)}</h3></div>
  ${r.file ? `<code>${esc(r.line ? `${r.file}:${r.line}` : r.file)}</code>` : ''}
  <p>${rich(r.message)}</p>
  <p class="fix"><span>Fix</span>${rich(r.fix)}</p>
</article>`).join('\n');
  }).join('\n');
}

/**
 * Renders a self-contained, shareable HTML report card.
 * @param {object} report from run()
 */
export function renderHtml(report) {
  const color = GRADE_COLOR[report.grade];
  const { critical, warning, info } = report.counts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preflight report: ${report.score}/100 (${report.grade})</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: radial-gradient(1200px 600px at 50% -200px, #1a2033, #0b0d12 60%); color: #e5e7eb;
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 880px; margin: 0 auto; padding: 48px 20px 64px; }
  .brand { display: flex; justify-content: space-between; align-items: center; color: #94a3b8; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; }
  .brand b { color: #e5e7eb; letter-spacing: .2em; }
  .card { margin-top: 18px; background: linear-gradient(180deg, #131722, #0f121a); border: 1px solid #222838; border-radius: 22px; padding: 32px; box-shadow: 0 30px 80px -30px rgba(0,0,0,.7); }
  .hero { display: grid; grid-template-columns: 180px 1fr; gap: 32px; align-items: center; }
  .gauge { width: 180px; height: 180px; }
  .gauge-score { fill: #f8fafc; font-size: 48px; font-weight: 800; }
  .gauge-out { fill: #64748b; font-size: 14px; }
  .grade { display: inline-block; font-weight: 800; font-size: 22px; color: ${color}; }
  .verdict { font-size: 26px; font-weight: 700; margin: 4px 0 10px; color: #f8fafc; }
  .counts { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
  .count { border: 1px solid #262c3b; border-radius: 999px; padding: 4px 12px; font-size: 13px; color: #cbd5e1; }
  .count i { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .bar { display: grid; grid-template-columns: 110px 1fr 28px; gap: 12px; align-items: center; margin: 7px 0; font-size: 13px; color: #94a3b8; }
  .bar-track { height: 8px; background: #1f2430; border-radius: 999px; overflow: hidden; }
  .bar-fill { display: block; height: 100%; border-radius: 999px; }
  .bar-count { text-align: right; color: #cbd5e1; font-weight: 600; }
  h2 { margin: 36px 0 12px; font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: #94a3b8; }
  .finding { background: #121621; border: 1px solid #222838; border-left: 3px solid var(--sev); border-radius: 14px; padding: 16px 18px; margin: 10px 0; }
  .finding-head { display: flex; gap: 10px; align-items: center; }
  .finding h3 { margin: 0; font-size: 16px; color: #f1f5f9; }
  .pill { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--sev); border: 1px solid var(--sev); border-radius: 999px; padding: 1px 8px; }
  code { display: inline-block; margin-top: 8px; font: 12.5px ui-monospace, SFMono-Regular, Menlo, monospace; color: #7dd3fc; background: #0b0e15; border: 1px solid #1e2433; border-radius: 8px; padding: 2px 8px; }
  .finding p { margin: 8px 0 0; color: #cbd5e1; }
  .fix { color: #d1fae5 !important; }
  code.inline { display: inline; margin: 0; padding: 1px 6px; font-size: 12.5px; color: #e2e8f0; }
  .fix span { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: #34d399; margin-right: 8px; }
  .clean { margin-top: 28px; padding: 22px; text-align: center; border: 1px dashed #2f3b2f; border-radius: 14px; color: #a7f3d0; font-weight: 600; }
  footer { margin-top: 28px; text-align: center; color: #64748b; font-size: 12.5px; }
  footer a { color: #94a3b8; }
  @media (max-width: 640px) { .hero { grid-template-columns: 1fr; justify-items: center; text-align: center; } .counts { justify-content: center; } .card { padding: 22px; } }
</style>
</head>
<body>
<main>
  <div class="brand"><b>Preflight</b><span>Launch readiness report</span></div>
  <section class="card">
    <div class="hero">
      ${gauge(report.score, color)}
      <div>
        <span class="grade">Grade ${report.grade}</span>
        <div class="verdict">${VERDICT[report.grade]}</div>
        <div class="counts">
          <span class="count"><i style="background:${SEVERITY_COLOR.critical}"></i>${critical} critical</span>
          <span class="count"><i style="background:${SEVERITY_COLOR.warning}"></i>${warning} warning${warning === 1 ? '' : 's'}</span>
          <span class="count"><i style="background:${SEVERITY_COLOR.info}"></i>${info} info</span>
          <span class="count">${report.rulesRun} checks · ${report.filesScanned ?? 0} files</span>
        </div>
        ${categoryBars(report)}
      </div>
    </div>
    ${findingCards(report)}
  </section>
  <footer>Generated by vibe-preflight · MIT · <a href="https://github.com/erdellll/preflight">github.com/erdellll/preflight</a></footer>
</main>
</body>
</html>
`;
}
