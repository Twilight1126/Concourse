-- Keep the beta dashboard focused on applications; outreach tables and APIs remain available.
create function public.user_application_dashboard_stats()
returns jsonb language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := (select auth.uid());
begin
  if owner_id is null then
    raise exception 'Sign in is required.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'stage_counts', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
        select status, count(*) as total from public.applications
        where user_id = owner_id group by status
      ) s
    ),
    'sources', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.applications desc), '[]'::jsonb) from (
        select public.dashboard_source_group(a.source, a.job_url) as name,
          count(*) as applications,
          count(*) filter (where a.status in ('interviewing', 'offered')) as interviews,
          count(*) filter (where a.status = 'offered') as offers
        from public.applications a where a.user_id = owner_id group by name
      ) s
    ),
    'application_activity', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
        select applied_at::date as day, count(*) as applications
        from public.applications where user_id = owner_id
          and applied_at >= current_date - interval '370 days'
        group by day
      ) s
    ),
    'recent', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.updated_at desc), '[]'::jsonb) from (
        select 'application'::text as kind, id, job_title, company_name, status, updated_at
        from public.applications where user_id = owner_id
        order by updated_at desc limit 5
      ) s
    )
  );
end;
$$;

revoke all on function public.user_application_dashboard_stats() from public, anon;
grant execute on function public.user_application_dashboard_stats() to authenticated;
