-- Milestone 3, checkpoint 2: authenticated ownership for applications.

alter table public.applications
add column user_id uuid not null default auth.uid()
references auth.users(id) on delete cascade;

create index applications_user_created_idx
on public.applications (user_id, created_at desc);

revoke all on public.applications from anon;
revoke all on sequence public.applications_id_seq from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
grant usage, select on sequence public.applications_id_seq to authenticated;

create policy "Users can read their applications"
on public.applications
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their applications"
on public.applications
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their applications"
on public.applications
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their applications"
on public.applications
for delete
to authenticated
using ((select auth.uid()) = user_id);
