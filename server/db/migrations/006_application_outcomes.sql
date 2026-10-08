-- Run once after 005_application_capture_details.sql.
ALTER TABLE applications
    ADD COLUMN interview_stage VARCHAR(64) NULL AFTER resume_filename,
    ADD COLUMN interview_at DATETIME NULL AFTER interview_stage,
    ADD COLUMN rejection_reason VARCHAR(500) NULL AFTER interview_at;
