-- Migration: Enhance notes table for Life Assistant task features
-- Adds note_type classification, task enrichment, priority, and completion tracking

-- Add note_type column for classifying notes
-- 'task' = action items (default for existing notes)
-- 'journal' = personal thoughts, no action needed
-- 'reminder' = time-based reminders (already handled by is_reminder flag)
ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  note_type TEXT DEFAULT 'task' CHECK (note_type IN ('journal', 'task', 'reminder'));

-- Add enrichment_data for AI-generated task enhancements
-- Structure: { links: [...], tips: [...], estimatedDuration: number, source: string }
ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  enrichment_data JSONB;

-- Add priority for task sorting
-- Time-sensitive tasks = high, location-based = medium, others = low
ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low'));

-- Add completed_at timestamp for completion tracking
-- Different from reminder_completed_at which is specific to reminders
ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  completed_at TIMESTAMPTZ;

-- Add input_method to track how the note was created
ALTER TABLE notes ADD COLUMN IF NOT EXISTS
  input_method TEXT DEFAULT 'voice' CHECK (input_method IN ('voice', 'text', 'quick_add'));

-- Create index for task queries (note_type + completion status)
CREATE INDEX IF NOT EXISTS idx_notes_type_completed
  ON notes(note_type, completed_at)
  WHERE note_type IN ('task', 'reminder');

-- Create index for priority sorting
CREATE INDEX IF NOT EXISTS idx_notes_priority
  ON notes(priority, created_at DESC)
  WHERE note_type = 'task';

-- Create index for enrichment queries
CREATE INDEX IF NOT EXISTS idx_notes_enrichment
  ON notes(user_id)
  WHERE enrichment_data IS NOT NULL;

-- Update existing notes to have proper note_type based on existing data
-- Notes with is_reminder = true get 'reminder' type
-- Others stay as 'task' (default)
UPDATE notes
SET note_type = 'reminder'
WHERE is_reminder = TRUE AND note_type = 'task';

-- Comment on columns for documentation
COMMENT ON COLUMN notes.note_type IS 'Classification: journal (thoughts), task (action items), reminder (time-based)';
COMMENT ON COLUMN notes.enrichment_data IS 'AI-generated task enhancements: links, tips, duration estimates';
COMMENT ON COLUMN notes.priority IS 'Task priority: high (time-sensitive), medium (location-based), low (general)';
COMMENT ON COLUMN notes.completed_at IS 'When task was marked complete (null = pending)';
COMMENT ON COLUMN notes.input_method IS 'How note was created: voice, text, or quick_add';
