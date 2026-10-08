-- Show every recorded source alongside the subset of applications sent.
-- Apply after 015_dashboard_source_groups.sql; 014 may already be installed.
create or replace function public.admin_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.admin_access() then
    raise exception 'Admin access is required.' using errcode = '42501';
  end if;

  insert into public.admin_audit_logs (admin_user_id, action)
  values ((select auth.uid()), 'view_dashboard');

  return jsonb_build_object(
    'members', (select count(*) from public.profiles),
    'new_members_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
    'applications', (select count(*) from public.applications),
    'outreach', (select count(*) from public.outreach),
    'outreach_sent', (select count(*) from public.outreach where sent_at is not null),
    'outreach_replied', (select count(*) from public.outreach where status = 'replied'),
    'stages', coalesce((
      select jsonb_object_agg(status, total) from (
        select status, count(*) as total from public.applications group by status
      ) stage_totals
    ), '{}'::jsonb),
    'sources', coalesce((
      select jsonb_agg(to_jsonb(source_totals)
        order by source_totals.sent desc, source_totals.applications desc, source_totals.name)
      from (
        select public.dashboard_source_group(a.source, a.job_url) as name,
          count(*) as applications,
          count(*) filter (where a.applied_at is not null) as sent
        from public.applications a group by name
      ) source_totals
    ), '[]'::jsonb),
    'recent_admin_activity', coalesce((
      select jsonb_agg(row_to_json(log_row)) from (
        select action, created_at from public.admin_audit_logs
        order by created_at desc limit 6
      ) log_row
    ), '[]'::jsonb)
  );
end;
$$;
