import { supabase } from './db';
export const join = (e, p) => supabase.auth.signUp({ email: e, password: p });
