import { palette, gradeColor, severityColor, stripAnsi } from './colors.js';
import { CATEGORIES } from '../score.js';

const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 };
const ICON = { critical: '✖', warning: '▲', info: '●' };
const BAR_CELLS = 24;

const plural = (n, word) => `${n} ${word}${n === 1 || word === 'info' ? '' : 's'}`;

/**
 * Renders the report card for a terminal.
 * @param {object} report from run()
 * @param {{ color?: boolean, width?: number }} [opts]
 */
export function renderTerminal(report, opts = {}) {
  const color = opts.color ?? (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
  const c = palette(color);
  const inner = Math.max(40, (opts.width ?? 50) - 2);
  const row = (text = '') => `│${text}${' '.repeat(Math.max(0, inner - [...stripAnsi(text)].length))}│`;
  const gc = c[gradeColor(report.grade)];
  const filled = Math.round((report.score / 100) * BAR_CELLS);
  const { critical, warning, info } = report.counts;

  const head = `  ${c.bold('PREFLIGHT')}`;
  const tag = c.dim('vibe-preflight');
  const lines = [
    `╭${'─'.repeat(inner)}╮`,
    row(head + ' '.repeat(Math.max(1, inner - [...stripAnsi(head)].length - [...stripAnsi(tag)].length - 2)) + tag + '  '),
    row(),
    row(`      ${gc(c.bold(`${report.score} / 100`))}     ${gc(c.bold(`Grade ${report.grade}`))}`),
    row(`      ${gc('█'.repeat(filled))}${c.dim('░'.repeat(BAR_CELLS - filled))}`),
    row(`  ${c.red(`${critical} critical`)} · ${c.yellow(plural(warning, 'warning'))} · ${c.gray(`${info} info`)} · ${c.dim(`${report.rulesRun} checks`)}`),
    `╰${'─'.repeat(inner)}╯`,
    '',
  ];

  if (!report.results.length) {
    lines.push(`  ${c.green('✔')} No issues found. Ready for takeoff.`, '');
  }

  for (const category of CATEGORIES) {
    const items = report.results
      .filter((r) => r.category === category)
      .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    if (!items.length) continue;
    lines.push(c.bold(category.toUpperCase()));
    for (const r of items) {
      const sc = c[severityColor(r.severity)];
      lines.push(` ${sc(`${ICON[r.severity]} ${r.severity.toUpperCase().padEnd(8)}`)} ${c.bold(r.title)}`);
      if (r.file) lines.push(`   ${c.cyan(r.line ? `${r.file}:${r.line}` : r.file)}`);
      lines.push(`   ${r.message}`);
      lines.push(`   ${c.green('→')} ${r.fix}`);
      lines.push('');
    }
  }

  lines.push(c.dim('Run with --html for a shareable report card.'));
  return lines.join('\n') + '\n';
}
