-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid primary key
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
