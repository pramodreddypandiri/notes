-- Migration: Add note_place_results table for Google Places search results
-- Run this in Supabase SQL Editor

-- Table to store Google Places results linked to notes with place intent
CREATE TABLE IF NOT EXISTS note_place_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE NOT NULL,

  -- Google Places data
  place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  rating DECIMAL(2,1),
  user_rating_count INTEGER DEFAULT 0,
  types TEXT[],
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  google_maps_uri TEXT,
  price_level TEXT,

  -- Search metadata
  search_query TEXT NOT NULL,

  -- User interaction
  status TEXT DEFAULT 'active',  -- 'active', 'dismissed', 'navigated'
  navigated_at TIMESTAMPTZ,

  -- Timestamps
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(note_id, place_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_note_place_results_user ON note_place_results(user_id, status);
CREATE INDEX IF NOT EXISTS idx_note_place_results_note ON note_place_results(note_id);
CREATE INDEX IF NOT EXISTS idx_note_place_results_query ON note_place_results(user_id, search_query);

-- Row Level Security
ALTER TABLE note_place_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note place results"
  ON note_place_results FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own note place results"
  ON note_place_results FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own note place results"
  ON note_place_results FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own note place results"
  ON note_place_results FOR DELETE USING (auth.uid() = user_id);

-- Add place intent fields to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS place_intent BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS place_search_query TEXT;

CREATE INDEX IF NOT EXISTS idx_notes_place_intent ON notes(user_id, place_intent) WHERE place_intent = TRUE;
