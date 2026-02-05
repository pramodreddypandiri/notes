-- Migration: Add productivity_metrics table for tracking daily productivity
-- This table stores daily task completion stats for insights and bedtime notifications

-- Create productivity_metrics table
CREATE TABLE IF NOT EXISTS productivity_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Daily task stats
  tasks_created INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_rolled_over INTEGER DEFAULT 0, -- Tasks that were moved from previous days
  completion_rate NUMERIC(5,2), -- Percentage (0-100)

  -- Time analysis
  most_productive_hour INTEGER CHECK (most_productive_hour >= 0 AND most_productive_hour <= 23),
  avg_completion_time_minutes INTEGER, -- Average time to complete tasks

  -- Behavioral metrics
  notes_recorded INTEGER DEFAULT 0,
  voice_notes_count INTEGER DEFAULT 0,
  text_notes_count INTEGER DEFAULT 0,
  patterns_detected INTEGER DEFAULT 0,

  -- Streak tracking
  streak_day INTEGER DEFAULT 0, -- Current streak count
  streak_broken BOOLEAN DEFAULT FALSE, -- Did streak break today?

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One record per user per day
  UNIQUE(user_id, date)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_productivity_user_date ON productivity_metrics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_productivity_user_streak ON productivity_metrics(user_id, streak_day DESC);

-- Enable Row Level Security
ALTER TABLE productivity_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotent migrations)
DROP POLICY IF EXISTS "Users can view own metrics" ON productivity_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON productivity_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON productivity_metrics;

-- RLS Policies
CREATE POLICY "Users can view own metrics"
  ON productivity_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON productivity_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON productivity_metrics FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_productivity_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER productivity_metrics_updated_at
  BEFORE UPDATE ON productivity_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_productivity_metrics_updated_at();
