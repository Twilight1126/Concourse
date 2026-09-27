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
    CHECK (status IN (
      'saved',
      'applied',
      'interviewing',
      'offered',
      'rejected',
      'withdrawn'
      )
   )
);