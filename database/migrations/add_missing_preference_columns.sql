-- Migration: Add missing columns to user_preferences table
-- Safe to run multiple times (uses IF NOT EXISTS)

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS enable_bedtime_reminder BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_pattern_suggestions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS enable_morning_briefing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 152,
  ADD COLUMN IF NOT EXISTS enable_location_reminders BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS store_audio_files BOOLEAN DEFAULT TRUE;
