-- Concourse table definitions are applied to the currently selected database.

CREATE TABLE IF NOT EXISTS applications (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   user_id CHAR(36) NOT NULL,
   company_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    job_url VARCHAR(2048),
    source VARCHAR(100),
    location VARCHAR(150),
    work_mode VARCHAR(32),
    employment_type VARCHAR(64),
    experience_min DECIMAL(4,1),
    experience_max DECIMAL(4,1),
    salary_min DECIMAL(14,2),
    salary_max DECIMAL(14,2),
    salary_currency CHAR(3),
    salary_period VARCHAR(32),
    expected_salary DECIMAL(14,2),
    experience_required VARCHAR(100),
    salary_budget VARCHAR(150),
    resume_filename VARCHAR(255),
    interview_stage VARCHAR(64),
    interview_at DATETIME,
    rejection_reason VARCHAR(500),
    status VARCHAR(32) NOT NULL DEFAULT 'saved',
    applied_at DATETIME,
    next_action VARCHAR(255),
    follow_up_at DATETIME,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP,


    PRIMARY KEY (id),
    INDEX applications_owner_created_idx (user_id, created_at, id),
    INDEX applications_owner_updated_idx (user_id, updated_at, id),
    INDEX applications_owner_status_idx (user_id, status),
    INDEX applications_owner_applied_idx (user_id, applied_at),

    CONSTRAINT chk_application_status
    CHECK (
    status IN (
        'saved',
        'applied',
        'screening',
        'interviewing',
        'offered',
        'rejected',
        'ghosted',
        'withdrawn'
    )
)
);

CREATE TABLE IF NOT EXISTS outreach (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
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
    INDEX outreach_owner_created_idx (user_id, created_at, id),
    INDEX outreach_owner_sent_idx (user_id, sent_at),
    INDEX outreach_follow_up_idx (status, follow_up_at),
    CONSTRAINT fk_outreach_application FOREIGN KEY (related_application_id)
        REFERENCES applications(id) ON DELETE SET NULL,
    CONSTRAINT chk_outreach_status
        CHECK (status IN ('draft', 'sent', 'follow_up_due', 'replied', 'closed'))
);

CREATE TABLE IF NOT EXISTS application_updates (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(32) NOT NULL,
    title VARCHAR(150) NOT NULL,
    happened_at DATETIME NOT NULL,
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX application_updates_application_date_idx (application_id, happened_at, id),
    CONSTRAINT fk_application_updates_application FOREIGN KEY (application_id)
        REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id CHAR(36) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(2048),
    email VARCHAR(320) NOT NULL,
    phone VARCHAR(30),
    location VARCHAR(150),
    timezone VARCHAR(100) NOT NULL,
    present_company VARCHAR(150),
    current_job_title VARCHAR(150),
    years_of_experience DECIMAL(4,1),
    skills TEXT,
    preferred_roles VARCHAR(500) NOT NULL,
    current_ctc DECIMAL(12,2),
    expected_ctc DECIMAL(12,2),
    currency CHAR(3),
    notice_period_days SMALLINT UNSIGNED,
    portfolio_url VARCHAR(2048),
    linkedin_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_profiles_user_id (user_id)
);

CREATE TABLE IF NOT EXISTS admin_memberships (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  admin_user_id CHAR(36) NOT NULL,
  action VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX admin_audit_created_idx (created_at)
);
