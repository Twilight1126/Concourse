-- The owner of legacy rows is not recorded. Assign them to the one existing
-- local admin account, as approved for this local database.
ALTER TABLE applications
  ADD COLUMN user_id CHAR(36) NULL AFTER id,
  ADD INDEX applications_owner_created_idx (user_id, created_at, id),
  ADD INDEX applications_owner_status_idx (user_id, status),
  ADD INDEX applications_owner_applied_idx (user_id, applied_at);

ALTER TABLE outreach
  ADD COLUMN user_id CHAR(36) NULL AFTER id,
  ADD INDEX outreach_owner_created_idx (user_id, created_at, id),
  ADD INDEX outreach_owner_sent_idx (user_id, sent_at);

-- A scalar subquery fails if there is more than one admin. If there is none,
-- the NOT NULL conversion below fails, leaving the rows available for review.
UPDATE applications SET user_id = (SELECT user_id FROM admin_memberships) WHERE user_id IS NULL;
UPDATE outreach SET user_id = (SELECT user_id FROM admin_memberships) WHERE user_id IS NULL;

-- Make ownership mandatory after every legacy row has an owner.
ALTER TABLE applications MODIFY user_id CHAR(36) NOT NULL;
ALTER TABLE outreach MODIFY user_id CHAR(36) NOT NULL;
