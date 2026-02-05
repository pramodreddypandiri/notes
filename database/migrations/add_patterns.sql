-- Migration: Add patterns table for implicit behavior learning
-- This table stores learned user patterns (recurring activities, time preferences, location preferences)

-- Create patterns table
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pattern classification
  pattern_type TEXT NOT NULL CHECK (pattern_type IN ('recurring_activity', 'time_preference', 'location_preference', 'store_preference')),
  activity TEXT NOT NULL, -- e.g., 'grocery_shopping', 'workout', 'coffee_run'

  -- Pattern data
  occurrences INTEGER DEFAULT 1,
  last_occurrence TIMESTAMPTZ,
  typical_day_of_week INTEGER CHECK (typical_day_of_week >= 0 AND typical_day_of_week <= 6), -- 0=Sunday, 6=Saturday
  typical_time TIME,
  typical_location TEXT,
  preferred_store TEXT, -- For store preferences (e.g., "Target" over "Walmart")

  -- Confidence and learning
  confidence NUMERIC(3,2) DEFAULT 0.00 CHECK (confidence >= 0 AND confidence <= 1),
  suggestion TEXT, -- What to suggest to user (e.g., "You usually shop on Saturdays. Want a reminder?")
  suggestion_shown_at TIMESTAMPTZ,
  suggestion_accepted BOOLEAN,
  suggestion_dismissed BOOLEAN DEFAULT FALSE,

  -- Related notes (for context)
  related_note_ids UUID[],

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one pattern per user per activity type
  UNIQUE(user_id, pattern_type, activity)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_patterns_user_id ON patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_user_confidence ON patterns(user_id, confidence DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_activity ON patterns(activity);

-- Enable Row Level Security
ALTER TABLE patterns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can insert own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can update own patterns" ON patterns;
DROP POLICY IF EXISTS "Users can delete own patterns" ON patterns;

-- RLS Policies
CREATE POLICY "Users can view own patterns"
  ON patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON patterns FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own patterns"
  ON patterns FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_patterns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER patterns_updated_at
  BEFORE UPDATE ON patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_patterns_updated_at();
