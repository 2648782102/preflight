import { supabase } from './db';

// An Expo app has no /privacy page in the tree: it opens the policy it links to.
export const join = (email: string, password: string) =>
  supabase.auth.signUp({ email, password });

export const Footer = () => (
  <a href="https://example.com/privacy-policy">Privacy policy</a>
);
