-- Run once after 006_application_outcomes.sql.
USE concourse;

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
