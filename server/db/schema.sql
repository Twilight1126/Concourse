-- Concourse table definitions are applied to the currently selected database.

CREATE TABLE IF NOT EXISTS applications (
   id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
   company_name VARCHAR(150) NOT NULL,
    job_title VARCHAR(150) NOT NULL,
    job_url VARCHAR(2048),
    source VARCHAR(100),
    status VARCHAR(32) NOT NULL DEFAULT 'saved',
    applied_at DATETIME,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP,


    PRIMARY KEY (id),

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
