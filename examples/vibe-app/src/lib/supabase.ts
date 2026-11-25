import { createClient } from '@supabase/supabase-js';
// Demo only: fake service_role key that should never ship to the browser.
export const supabase = createClient('https://demo.supabase.co', '__SERVICE_ROLE_JWT__');
export const signUp = (email: string, password: string) => supabase.auth.signUp({ email, password });
