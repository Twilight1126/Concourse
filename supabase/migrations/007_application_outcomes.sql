alter table public.applications
  add column interview_stage varchar(64),
  add column interview_at timestamptz,
  add column rejection_reason varchar(500);
