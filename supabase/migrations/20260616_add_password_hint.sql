-- Add password_hint column to users_profile for forgot-password feature
ALTER TABLE users_profile ADD COLUMN IF NOT EXISTS password_hint TEXT;
