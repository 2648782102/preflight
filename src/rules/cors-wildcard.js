const CODE = /\.(?:js|jsx|mjs|cjs|ts|tsx|py|rb|go|php|json|toml|ya?ml)$/;
const PATTERNS = [
  /\bcors\(\s*\)/,
  /Access-Control-Allow-Origin['"]?\s*[:,=]\s*['"]\*['"]/i,
  /\borigin\s*:\s*['"]\*['"]/,
  /allow_origins\s*=\s*\[\s*['"]\*['"]\s*\]/,
];

export default {
  id: 'cors-wildcard',
  title: 'CORS allows every website',
  category: 'security',
  severity: 'warning',
  check(project) {
    const findings = [];
    for (const file of project.files.filter((f) => CODE.test(f) && f !== 'package.json')) {
      project.lines(file).forEach((line, i) => {
        if (PATTERNS.some((re) => re.test(line))) {
          findings.push({
            file,
            line: i + 1,
            message: 'CORS is open to every origin, so any website can call this API from a visitor\'s browser.',
            fix: "List the origins you trust, for example `cors({ origin: ['https://yourapp.com'] })`.",
          });
        }
      });
    }
    return findings;
  },
};
