create table public.profiles (
  id uuid primary key references auth.users,
  email text,
  plan text default 'free'
);

create table public.payments (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles,
  amount integer
);
