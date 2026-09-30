-- Run once with the local MySQL administrator connection after 001_profiles.sql.
ALTER TABLE profiles
    ADD COLUMN avatar_url VARCHAR(2048) AFTER display_name,
    ADD COLUMN email VARCHAR(320) NULL AFTER avatar_url,
    ADD COLUMN phone VARCHAR(30) AFTER email,
    ADD COLUMN location VARCHAR(150) AFTER phone,
    ADD COLUMN present_company VARCHAR(150) AFTER timezone,
    ADD COLUMN current_job_title VARCHAR(150) AFTER present_company,
    ADD COLUMN years_of_experience DECIMAL(4,1) AFTER current_job_title,
    ADD COLUMN skills TEXT AFTER years_of_experience,
    ADD COLUMN preferred_roles VARCHAR(500) NULL AFTER skills,
    ADD COLUMN current_ctc DECIMAL(12,2) AFTER preferred_roles,
    ADD COLUMN expected_ctc DECIMAL(12,2) AFTER current_ctc,
    ADD COLUMN currency CHAR(3) AFTER expected_ctc,
    ADD COLUMN notice_period_days SMALLINT UNSIGNED AFTER currency,
    ADD COLUMN portfolio_url VARCHAR(2048) AFTER notice_period_days,
    ADD COLUMN linkedin_url VARCHAR(2048) AFTER portfolio_url;

UPDATE profiles
SET email = 'local-profile@invalid.test',
    preferred_roles = COALESCE(target_roles, 'Software Engineer')
WHERE id = 1 AND email IS NULL;

ALTER TABLE profiles
    MODIFY email VARCHAR(320) NOT NULL,
    MODIFY preferred_roles VARCHAR(500) NOT NULL,
    DROP COLUMN target_roles,
    DROP COLUMN skills_summary,
    DROP COLUMN signature_name;

-- Reset the temporary draft created while the first onboarding screen was reviewed.
DELETE FROM profiles WHERE id = 1;
