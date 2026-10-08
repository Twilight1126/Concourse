export const mysqlSourceGroup = (alias) => {
  const signal = `LOWER(CASE WHEN LOWER(TRIM(COALESCE(${alias}.source, ''))) IN ('', 'manual', 'manual / unknown')
    THEN SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(${alias}.job_url, ''), '/', 3), '/', -1)
    ELSE ${alias}.source END)`;
  return `CASE
  WHEN ${signal} LIKE '%linkedin%' THEN 'LinkedIn'
  WHEN ${signal} LIKE '%indeed%' THEN 'Indeed'
  WHEN ${signal} LIKE '%monster%' OR ${signal} LIKE '%foundit%' THEN 'Monster'
  WHEN ${signal} LIKE '%naukri%' THEN 'Naukri'
  WHEN ${signal} LIKE '%glassdoor%' THEN 'Glassdoor'
  WHEN ${signal} LIKE '%wellfound%' OR ${signal} LIKE '%angel.co%' THEN 'Wellfound'
  WHEN ${signal} LIKE '%instahyre%' THEN 'Instahyre'
  WHEN ${signal} LIKE '%cutshort%' THEN 'Cutshort'
  WHEN ${signal} LIKE '%hirist%' THEN 'Hirist'
  WHEN ${signal} LIKE '%shine.com%' OR ${signal} = 'shine' THEN 'Shine'
  WHEN ${signal} LIKE '%timesjobs%' THEN 'TimesJobs'
  WHEN ${signal} LIKE '%internshala%' THEN 'Internshala'
  WHEN ${signal} LIKE '%ziprecruiter%' THEN 'ZipRecruiter'
  WHEN ${signal} LIKE '%dice.com%' OR ${signal} = 'dice' THEN 'Dice'
  WHEN (${alias}.source IS NULL OR ${alias}.source = '' OR LOWER(TRIM(${alias}.source)) IN ('manual', 'manual / unknown'))
    AND (${alias}.job_url IS NULL OR ${alias}.job_url = '') THEN 'Manual'
  WHEN ${alias}.source IS NOT NULL AND TRIM(${alias}.source) <> ''
    AND ${alias}.source NOT LIKE '%.%' AND ${alias}.source NOT LIKE '%/%' AND ${alias}.source NOT LIKE '%:%'
    AND LOWER(TRIM(${alias}.source)) NOT IN ('manual', 'company portal', 'company_portal', 'company-portal', 'company website', 'company site', 'career page', 'career site', 'direct', 'greenhouse', 'lever', 'workday', 'darwinbox', 'zoho recruit')
    AND LOWER(TRIM(${alias}.source)) NOT REGEXP '(^|[[:space:]])(careers?|jobs?)$' THEN TRIM(${alias}.source)
  ELSE 'Company portal' END`;
};
