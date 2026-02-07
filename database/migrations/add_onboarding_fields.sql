-- Migration: Add new onboarding profile fields
-- Description: Adds age_range, gender, wake_up_time, bed_time, hobbies, tone, and self_description fields
-- Date: 2025-02-07

-- Add new onboarding fields to user_profiles table
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS age_range TEXT CHECK (age_range IN ('18-24', '25-34', '35-44', '45-54', '55-64', '65+')),
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'non_binary', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS wake_up_time TEXT, -- HH:mm format
ADD COLUMN IF NOT EXISTS bed_time TEXT, -- HH:mm format
ADD COLUMN IF NOT EXISTS hobbies TEXT, -- Free text for user hobbies
ADD COLUMN IF NOT EXISTS tone TEXT CHECK (tone IN ('professional', 'friendly', 'casual', 'motivational')),
ADD COLUMN IF NOT EXISTS self_description TEXT; -- Under 150 chars - "Who do you think you are?"

-- Add constraint to limit self_description length
ALTER TABLE user_profiles
ADD CONSTRAINT self_description_length CHECK (char_length(self_description) <= 150);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_tone ON user_profiles(tone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_age_range ON user_profiles(age_range);

-- Comment on new columns
COMMENT ON COLUMN user_profiles.age_range IS 'User age range for personalization';
COMMENT ON COLUMN user_profiles.gender IS 'User gender identity';
COMMENT ON COLUMN user_profiles.wake_up_time IS 'Typical wake up time in HH:mm format';
COMMENT ON COLUMN user_profiles.bed_time IS 'Typical bed time in HH:mm format';
COMMENT ON COLUMN user_profiles.hobbies IS 'Free text description of user hobbies';
COMMENT ON COLUMN user_profiles.tone IS 'Preferred communication tone for the app';
COMMENT ON COLUMN user_profiles.self_description IS 'Brief self-description (max 150 chars)';
