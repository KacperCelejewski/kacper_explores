-- Add quiz_preferences column to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS quiz_preferences JSONB DEFAULT NULL;
