import { supabase } from './db';
export const join = (e: string, p: string) => supabase.auth.signUp({ email: e, password: p });
