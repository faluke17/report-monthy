-- Add employee-specific fields to users_profile for self-registration flow
ALTER TABLE users_profile
  ADD COLUMN IF NOT EXISTS employee_id  TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS name_first   TEXT,
  ADD COLUMN IF NOT EXISTS name_last    TEXT,
  ADD COLUMN IF NOT EXISTS ba           TEXT,
  ADD COLUMN IF NOT EXISTS costcenter   TEXT,
  ADD COLUMN IF NOT EXISTS wwcode       TEXT,
  ADD COLUMN IF NOT EXISTS branch_name_th TEXT;
