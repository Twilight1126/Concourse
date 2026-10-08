-- Keep legacy company_portal values in the same group as employer career links.
-- Apply after 016_admin_source_comparison.sql.
create or replace function public.dashboard_source_group(source_text text, job_url text)
returns text language sql immutable set search_path = ''
as $$
  select case
    when signal like '%linkedin%' then 'LinkedIn'
    when signal like '%indeed%' then 'Indeed'
    when signal like '%monster%' or signal like '%foundit%' then 'Monster'
    when signal like '%naukri%' then 'Naukri'
    when signal like '%glassdoor%' then 'Glassdoor'
    when signal like '%wellfound%' or signal like '%angel.co%' then 'Wellfound'
    when signal like '%instahyre%' then 'Instahyre'
    when signal like '%cutshort%' then 'Cutshort'
    when signal like '%hirist%' then 'Hirist'
    when signal like '%shine.com%' or signal = 'shine' then 'Shine'
    when signal like '%timesjobs%' then 'TimesJobs'
    when signal like '%internshala%' then 'Internshala'
    when signal like '%ziprecruiter%' then 'ZipRecruiter'
    when signal like '%dice.com%' or signal = 'dice' then 'Dice'
    when (source_text is null or btrim(source_text) = ''
      or lower(btrim(source_text)) in ('manual', 'manual / unknown'))
      and (job_url is null or job_url = '') then 'Manual / unknown'
    when source_text is not null and btrim(source_text) <> ''
      and source_text !~ '[./:]'
      and lower(btrim(source_text)) not in
        ('manual', 'company portal', 'company_portal', 'company-portal', 'company website',
         'company site', 'career page', 'career site', 'direct', 'greenhouse', 'lever',
         'workday', 'darwinbox', 'zoho recruit')
      and btrim(source_text) !~* '(^|[[:space:]])(careers?|jobs?)$' then btrim(source_text)
    else 'Company portal'
  end
  from (select lower(case
    when lower(btrim(coalesce(source_text, ''))) in ('', 'manual', 'manual / unknown')
      then coalesce(substring(job_url from '^https?://([^/]+)'), '')
    else source_text
  end) as signal) source_value
$$;
