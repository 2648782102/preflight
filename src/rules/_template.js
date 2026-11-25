/**
 * Template for a new Preflight check. Copy this file to
 * src/rules/<your-rule-id>.js, then add tests/fixtures/<your-rule-id>/bad
 * (must be flagged) and tests/fixtures/<your-rule-id>/good (must stay quiet).
 *
 * project.files       every scanned file, as POSIX paths relative to the root
 * project.read(f)     file contents ('' if unreadable)
 * project.lines(f)    file contents split into lines
 * project.has(re)     true if any file path matches the regex
 * project.gitignore   the root .gitignore lines
 */
export default {
  id: 'example-rule',
  title: 'Short, human title of the problem',
  category: 'security', // security | reliability | launch
  severity: 'warning', // critical | warning | info
  check(project) {
    const findings = [];
    for (const file of project.files) {
      project.lines(file).forEach((line, i) => {
        if (line.includes('SOMETHING_RISKY')) {
          findings.push({
            file,
            line: i + 1,
            message: 'What is wrong, in one sentence.',
            fix: 'What to do about it, in one sentence.',
          });
        }
      });
    }
    return findings;
  },
};
