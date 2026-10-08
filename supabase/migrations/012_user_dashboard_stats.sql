-- Keep dashboard transfer bounded as the user's application list grows.
create index applications_user_status_idx on public.applications (user_id, status);
create index applications_user_applied_idx on public.applications (user_id, applied_at);
create index outreach_user_sent_idx on public.outreach (user_id, sent_at);

create function public.dashboard_source_group(source_text text, job_url text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%linkedin%' then 'LinkedIn'
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%indeed%' then 'Indeed'
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%monster%'
      or lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%foundit%' then 'Monster'
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%naukri%' then 'Naukri'
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%glassdoor%' then 'Glassdoor'
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%wellfound%'
      or lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%angel.co%' then 'Wellfound'
    when lower(coalesce(source_text, '') || ' ' || coalesce(job_url, '')) like '%instahyre%' then 'Instahyre'
    when (source_text is null or source_text = '' or lower(source_text) = 'manual')
      and (job_url is null or job_url = '') then 'Manual / unknown'
    else 'Company portal'
  end
$$;

create function public.user_dashboard_stats()
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
    'source_replies', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
        select public.dashboard_source_group(a.source, a.job_url) as name, count(*) as replies
        from public.outreach o join public.applications a on a.id = o.related_application_id
        where o.user_id = owner_id and a.user_id = owner_id and o.status = 'replied'
        group by name
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
    'outreach_activity', (
      select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb) from (
        select sent_at::date as day, count(*) as outreach
        from public.outreach where user_id = owner_id
          and sent_at >= current_date - interval '370 days'
        group by day
      ) s
    ),
    'outreach_totals', (
      select jsonb_build_object('sent', count(*),
        'replied', count(*) filter (where status = 'replied'))
      from public.outreach where user_id = owner_id and sent_at is not null
    ),
    'recent', (
      select coalesce(jsonb_agg(to_jsonb(s) order by s.updated_at desc), '[]'::jsonb) from (
        select 'application'::text as kind, id, job_title, null::text as contact_name,
          null::text as contact_email, company_name, status, updated_at
        from public.applications where user_id = owner_id
        union all
        select 'outreach'::text, id, null::text, contact_name, contact_email,
          company_name, status, updated_at
        from public.outreach where user_id = owner_id
        order by updated_at desc limit 5
      ) s
    )
  );
end;
$$;

revoke all on function public.dashboard_source_group(text, text) from public, anon;
grant execute on function public.dashboard_source_group(text, text) to authenticated;
revoke all on function public.user_dashboard_stats() from public, anon;
grant execute on function public.user_dashboard_stats() to authenticated;
