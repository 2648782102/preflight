const CODE = /\.(?:js|jsx|mjs|ts|tsx|vue|svelte|html|astro|dart|swift|kt|py)$/;
const COLLECTS_DATA = /supabase\.auth\.|\bsignUp\(|createUserWithEmailAndPassword|signInWithPassword|<input[^>]{0,1000}type=["']email|next-auth|@clerk\/|@auth0\/|firebase\/auth|useSignUp\(/;
const PRIVACY = /privacy/i;
/**
 * A privacy policy can also be a page the app links to rather than one it ships, which is how an
 * Expo or React Native app does it. The URL has to lead somewhere policy-like, so a bare mention of
 * the word in a sentence does not silence the check.
 */
const POLICY_URL = /https?:\/\/[^\s"'`<>]*privacy[^\s"'`<>]*/i;
/** Apple's privacy manifest states what the app collects; it is not a policy a user can read. */
const APPLE_MANIFEST = /\.xcprivacy$/i;

export default {
  id: 'no-privacy-policy',
  title: 'No privacy policy',
  category: 'launch',
  severity: 'warning',
  check(project) {
    // A policy the app ships silences the check, unless the only matching path is Apple's manifest:
    // `ios/PrivacyInfo.xcprivacy` says what the app collects, not what a user may read (#20).
    if (project.files.some((f) => PRIVACY.test(f) && !APPLE_MANIFEST.test(f))) return [];
    const collector = project.files.find((f) => CODE.test(f) && COLLECTS_DATA.test(project.read(f)));
    if (!collector) return [];
    if (project.files.some((f) => CODE.test(f) && POLICY_URL.test(project.read(f)))) return [];
    return [{
      file: collector,
      message: 'The app signs users up or collects emails but has no privacy policy page. App stores, payment providers and privacy laws require one.',
      fix: 'Add a /privacy page that says what you collect, why, who processes it (for example Supabase, Stripe) and how users delete their data.',
    }];
  },
};
