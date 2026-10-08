-- Run once after 003_profile_ownership.sql.

ALTER TABLE applications
    ADD COLUMN location VARCHAR(150) NULL AFTER source,
    ADD COLUMN work_mode VARCHAR(32) NULL AFTER location,
    ADD COLUMN employment_type VARCHAR(64) NULL AFTER work_mode,
    ADD COLUMN experience_min DECIMAL(4,1) NULL AFTER employment_type,
    ADD COLUMN experience_max DECIMAL(4,1) NULL AFTER experience_min,
    ADD COLUMN salary_min DECIMAL(14,2) NULL AFTER experience_max,
    ADD COLUMN salary_max DECIMAL(14,2) NULL AFTER salary_min,
    ADD COLUMN salary_currency CHAR(3) NULL AFTER salary_max,
    ADD COLUMN salary_period VARCHAR(32) NULL AFTER salary_currency,
    ADD COLUMN expected_salary DECIMAL(14,2) NULL AFTER salary_period,
    ADD COLUMN next_action VARCHAR(255) NULL AFTER applied_at,
    ADD COLUMN follow_up_at DATETIME NULL AFTER next_action;

CREATE TABLE outreach (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    contact_name VARCHAR(150),
    contact_title VARCHAR(150),
    company_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(320) NOT NULL,
    sender_email VARCHAR(320) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    resume_filename VARCHAR(255),
    linkedin_url VARCHAR(2048),
    source VARCHAR(100) NOT NULL DEFAULT 'Gmail',
    contact_source VARCHAR(100),
    outreach_type VARCHAR(64),
    related_application_id BIGINT UNSIGNED,
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    sent_at DATETIME,
    follow_up_at DATETIME,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX outreach_follow_up_idx (status, follow_up_at),
    CONSTRAINT fk_outreach_application FOREIGN KEY (related_application_id)
        REFERENCES applications(id) ON DELETE SET NULL,
    CONSTRAINT chk_outreach_status
        CHECK (status IN ('draft', 'sent', 'follow_up_due', 'replied', 'closed'))
);
