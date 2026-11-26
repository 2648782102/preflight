const CODE = /\.(?:js|jsx|mjs|cjs|ts|tsx|py|rb|go|php|json|toml|ya?ml)$/;
const PATTERNS = [
  /\bcors\(\s*\)/,
  /Access-Control-Allow-Origin['"]?\s*[:,=]\s*['"]\*['"]/i,
  /\borigin\s*:\s*['"]\*['"]/,
  /allow_origins\s*=\s*\[\s*['"]\*['"]\s*\]/,
];

/** Supabase ships this template with every edge function, so its fix has to name the file's own object. */
const SUPABASE_FUNCTION = /(?:^|\/)supabase\/functions\//;

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
            fix: SUPABASE_FUNCTION.test(file)
              // Naming the object the template already has is easier to act on than generic middleware
              // advice, and the finding itself is just as real (#22).
              ? "Replace `'*'` in the function's `corsHeaders` with your app's origin, for example `'Access-Control-Allow-Origin': 'https://yourapp.com'`."
              : "List the origins you trust, for example `cors({ origin: ['https://yourapp.com'] })`.",
          });
        }
      });
    }
    return findings;
  },
};
