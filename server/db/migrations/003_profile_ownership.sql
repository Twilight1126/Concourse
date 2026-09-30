-- Run once with the local MySQL administrator connection after 002_expand_profiles.sql.
-- Existing profile data is claimed by its matching verified email on the next sign-in.
ALTER TABLE profiles
    DROP CHECK chk_single_local_profile,
    MODIFY id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ADD COLUMN user_id CHAR(36) NULL AFTER id,
    ADD UNIQUE KEY uq_profiles_user_id (user_id);
