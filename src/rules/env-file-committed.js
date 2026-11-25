import { isGitignored } from './_gitignore.js';

const ENV_FILE = /(?:^|\/)\.env(?:\.[\w.-]+)?$/;
const SAFE = /\.(?:example|sample|template|defaults|dist)$/;

export default {
  id: 'env-file-committed',
  title: '.env file is not git-ignored',
  category: 'security',
  severity: 'critical',
  check(project) {
    return project.files
      .filter((f) => ENV_FILE.test(f) && !SAFE.test(f) && !isGitignored(f, project.gitignore))
      .map((file) => ({
        file,
        message: `${file} holds secrets but .gitignore does not cover it, so it can be committed and pushed.`,
        fix: 'Add `.env*` (and `!.env.example`) to .gitignore, run `git rm --cached ' + file + '`, and rotate any keys that were pushed.',
      }));
  },
};
