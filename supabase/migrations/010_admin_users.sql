-- Only a verified admin may read onboarding profiles across accounts.
create function public.admin_users(page_number integer default 1, search_text text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_page integer := greatest(1, least(coalesce(page_number, 1), 100000));
  pattern text := '%' || left(trim(coalesce(search_text, '')), 100) || '%';
  total_count bigint;
  user_rows jsonb;
begin
  if not public.admin_access() then
    raise exception 'Admin access is required.' using errcode = '42501';
  end if;

  select count(*) into total_count from public.profiles
  where display_name ilike pattern or email ilike pattern;

  select coalesce(jsonb_agg(to_jsonb(profile_row)), '[]'::jsonb) into user_rows
  from (
    select user_id, display_name, avatar_url, email, phone, location, timezone,
      present_company, current_job_title, years_of_experience, skills, preferred_roles,
      current_ctc, expected_ctc, currency, notice_period_days, portfolio_url, linkedin_url,
      created_at, updated_at
    from public.profiles
    where display_name ilike pattern or email ilike pattern
    order by created_at desc, user_id desc
    limit 10 offset (safe_page - 1) * 10
  ) profile_row;

  return jsonb_build_object('users', user_rows, 'total', total_count,
    'page', safe_page, 'page_size', 10);
end;
$$;

revoke all on function public.admin_users(integer, text) from public, anon;
grant execute on function public.admin_users(integer, text) to authenticated;
