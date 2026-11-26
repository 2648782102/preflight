const CODE = /\.(?:js|jsx|mjs|ts|tsx|vue|svelte|html|astro|dart|swift|kt|py)$/;
const COLLECTS_DATA = /supabase\.auth\.|\bsignUp\(|createUserWithEmailAndPassword|signInWithPassword|<input[^>]{0,1000}type=["']email|next-auth|@clerk\/|@auth0\/|firebase\/auth|useSignUp\(/;
const PRIVACY = /privacy/i;

export default {
  id: 'no-privacy-policy',
  title: 'No privacy policy',
  category: 'launch',
  severity: 'warning',
  check(project) {
    if (project.has(PRIVACY)) return [];
    const collector = project.files.find((f) => CODE.test(f) && COLLECTS_DATA.test(project.read(f)));
    if (!collector) return [];
    return [{
      file: collector,
      message: 'The app signs users up or collects emails but has no privacy policy page. App stores, payment providers and privacy laws require one.',
      fix: 'Add a /privacy page that says what you collect, why, who processes it (for example Supabase, Stripe) and how users delete their data.',
    }];
  },
};
