-- Run once with the local MySQL administrator connection.
-- The application account intentionally does not have CREATE TABLE permission.
CREATE TABLE IF NOT EXISTS profiles (
    id TINYINT UNSIGNED NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    target_roles VARCHAR(500),
    skills_summary TEXT,
    signature_name VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT chk_single_local_profile CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE ON profiles TO 'concourse_app'@'localhost';
