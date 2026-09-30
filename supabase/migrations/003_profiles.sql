-- Beta profile data is separate from Supabase Auth identity data.
create table public.profiles (
  user_id uuid primary key default auth.uid()
    references auth.users(id) on delete cascade,
  display_name varchar(100) not null,
  avatar_url varchar(2048),
  email varchar(320) not null,
  phone varchar(30),
  location varchar(150),
  timezone varchar(100) not null,
  present_company varchar(150),
  current_job_title varchar(150),
  years_of_experience numeric(4,1),
  skills text,
  preferred_roles varchar(500) not null,
  current_ctc numeric(12,2),
  expected_ctc numeric(12,2),
  currency char(3),
  notice_period_days smallint,
  portfolio_url varchar(2048),
  linkedin_url varchar(2048),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, insert, update, delete on public.profiles to authenticated;

create policy "Users can read their profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
