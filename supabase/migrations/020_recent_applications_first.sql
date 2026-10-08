-- Show recently changed applications first, including Saved -> Applied transitions.
-- Apply after 019_label_manual_source.sql.
create index if not exists applications_user_updated_idx
on public.applications (user_id, updated_at desc, id desc);

create or replace function public.applications_page(
  page_number integer default 1,
  search_text text default '',
  status_filter text default null,
  source_filter text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  safe_page integer := greatest(1, least(coalesce(page_number, 1), 100000));
  pattern text := '%' || left(trim(coalesce(search_text, '')), 100) || '%';
  rows jsonb;
  total_count bigint;
  sources jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;

  select count(*) into total_count from public.applications a
  where a.user_id = (select auth.uid())
    and (status_filter is null or a.status = status_filter)
    and (source_filter is null or public.dashboard_source_group(a.source, a.job_url) = source_filter)
    and (a.company_name ilike pattern or a.job_title ilike pattern or
      a.location ilike pattern or a.source ilike pattern or a.work_mode ilike pattern);

  select coalesce(jsonb_agg(to_jsonb(item) order by item.updated_at desc, item.id desc), '[]'::jsonb)
  into rows from (
    select a.id, a.company_name, a.job_title, a.job_url, a.source, a.location,
      a.work_mode, a.employment_type, a.experience_min, a.experience_max,
      a.salary_min, a.salary_max, a.salary_currency, a.salary_period,
      a.expected_salary, a.experience_required, a.salary_budget,
      a.resume_filename, a.interview_stage, a.interview_at, a.rejection_reason,
      a.status, a.applied_at, a.next_action, a.follow_up_at, a.notes,
      a.created_at, a.updated_at
    from public.applications a
    where a.user_id = (select auth.uid())
      and (status_filter is null or a.status = status_filter)
      and (source_filter is null or public.dashboard_source_group(a.source, a.job_url) = source_filter)
      and (a.company_name ilike pattern or a.job_title ilike pattern or
        a.location ilike pattern or a.source ilike pattern or a.work_mode ilike pattern)
    order by a.updated_at desc, a.id desc
    limit 10 offset (safe_page - 1) * 10
  ) item;

  select coalesce(jsonb_agg(source order by source), '[]'::jsonb) into sources from (
    select distinct public.dashboard_source_group(a.source, a.job_url) as source
    from public.applications a
    where a.user_id = (select auth.uid())
  ) distinct_sources;

  return jsonb_build_object('items', rows, 'total', total_count,
    'page', safe_page, 'page_size', 10, 'sources', sources);
end;
$$;

revoke all on function public.applications_page(integer, text, text, text) from public, anon;
grant execute on function public.applications_page(integer, text, text, text) to authenticated;
