-- Run once after 004_beta1_tracking.sql.

ALTER TABLE applications
    ADD COLUMN experience_required VARCHAR(100) NULL AFTER employment_type,
    ADD COLUMN salary_budget VARCHAR(150) NULL AFTER expected_salary,
    ADD COLUMN resume_filename VARCHAR(255) NULL AFTER salary_budget;
