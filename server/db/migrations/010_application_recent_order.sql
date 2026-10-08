-- Keep the Applications list fast when a member has many tracked roles.
-- Apply after 009_local_ownership.sql.
CREATE INDEX applications_owner_updated_idx ON applications (user_id, updated_at, id);
