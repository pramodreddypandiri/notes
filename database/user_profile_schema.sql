-- ============================================
-- USER PROFILE & PERSONALITY TRAITS SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor after the initial schema

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
-- Stores personality traits and preferences for AI personalization

CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- ==========================================
  -- PERSONALITY SPECTRUM (1-10 scale)
  -- ==========================================
  -- 1 = strongly left trait, 10 = strongly right trait

  -- Social energy: 1=introvert, 10=extrovert
  -- Affects: venue size, crowd tolerance, group recommendations
  introvert_extrovert INTEGER DEFAULT 5 CHECK (introvert_extrovert BETWEEN 1 AND 10),

  -- Planning style: 1=meticulous planner, 10=spontaneous
  -- Affects: how far ahead plans are made, flexibility in itinerary
  spontaneous_planner INTEGER DEFAULT 5 CHECK (spontaneous_planner BETWEEN 1 AND 10),

  -- Adventure level: 1=comfort-seeking, 10=adventurous
  -- Affects: willingness to try new places/cuisines
  adventurous_comfort INTEGER DEFAULT 5 CHECK (adventurous_comfort BETWEEN 1 AND 10),

  -- Activity energy: 1=relaxed/chill, 10=high-energy
  -- Affects: activity types recommended
  energy_level INTEGER DEFAULT 5 CHECK (energy_level BETWEEN 1 AND 10),

  -- Decision making: 1=decisive, 10=likes options
  -- Affects: number of alternatives presented
  decisiveness INTEGER DEFAULT 5 CHECK (decisiveness BETWEEN 1 AND 10),

  -- ==========================================
  -- SOCIAL PREFERENCES
  -- ==========================================

  -- Typical group configuration
  preferred_group_size TEXT DEFAULT 'flexible'
    CHECK (preferred_group_size IN ('solo', 'couple', 'small_group', 'large_group', 'flexible')),

  -- Openness to meeting new people
  social_openness TEXT DEFAULT 'moderate'
    CHECK (social_openness IN ('low', 'moderate', 'high')),

  -- Primary social context
  social_context TEXT DEFAULT 'mixed'
    CHECK (social_context IN ('date_night', 'friends', 'family', 'solo', 'mixed')),

  -- ==========================================
  -- PRACTICAL PREFERENCES
  -- ==========================================

  -- Spending comfort level
  budget_sensitivity TEXT DEFAULT 'moderate'
    CHECK (budget_sensitivity IN ('budget', 'moderate', 'splurge', 'flexible')),

  -- Preferred time of day for activities
  time_preference TEXT DEFAULT 'flexible'
    CHECK (time_preference IN ('morning', 'afternoon', 'evening', 'night', 'flexible')),

  -- How they handle crowded places
  crowd_tolerance TEXT DEFAULT 'moderate'
    CHECK (crowd_tolerance IN ('low', 'moderate', 'high')),

  -- Itinerary density preference
  pace_preference TEXT DEFAULT 'balanced'
    CHECK (pace_preference IN ('relaxed', 'balanced', 'packed')),

  -- Travel/distance tolerance (in miles)
  max_travel_distance INTEGER DEFAULT 15 CHECK (max_travel_distance BETWEEN 1 AND 100),

  -- ==========================================
  -- AI-INFERRED DATA (Updated automatically)
  -- ==========================================

  -- Interests extracted from notes
  -- Example: ["bowling", "mexican food", "live music", "hiking"]
  inferred_interests JSONB DEFAULT '[]'::jsonb,

  -- Things they've expressed dislike for
  -- Example: ["crowded bars", "early mornings", "seafood"]
  inferred_dislikes JSONB DEFAULT '[]'::jsonb,

  -- Current mood/state signals from recent notes
  -- Example: {"stress_level": "high", "seeking": "relaxation", "recent_theme": "work pressure"}
  mood_signals JSONB DEFAULT '{}'::jsonb,

  -- Food preferences extracted from notes
  -- Example: {"favorites": ["mexican", "italian"], "dietary": ["vegetarian-friendly"], "avoid": ["seafood"]}
  food_preferences JSONB DEFAULT '{}'::jsonb,

  -- Activity preferences with frequency
  -- Example: {"bowling": 5, "movies": 3, "hiking": 2}
  activity_frequency JSONB DEFAULT '{}'::jsonb,

  -- ==========================================
  -- ONBOARDING & METADATA
  -- ==========================================

  -- Has user completed onboarding?
  onboarding_completed BOOLEAN DEFAULT false,

  -- Which onboarding step they're on (if incomplete)
  onboarding_step INTEGER DEFAULT 0,

  -- Profile completeness percentage
  profile_completeness INTEGER DEFAULT 0 CHECK (profile_completeness BETWEEN 0 AND 100),

  -- Last time AI analyzed their notes
  last_ai_analysis TIMESTAMPTZ,

  -- Number of notes analyzed
  notes_analyzed_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PLAN PATTERNS TABLE
-- ============================================
-- Tracks what worked and didn't work for each user

CREATE TABLE plan_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- ==========================================
  -- POSITIVE PATTERNS (What worked)
  -- ==========================================

  -- Activity types they liked
  -- Example: ["bowling", "casual_dining", "dessert"]
  liked_activity_types JSONB DEFAULT '[]'::jsonb,

  -- Time slots that worked well
  -- Example: ["saturday_evening", "sunday_afternoon"]
  liked_time_slots JSONB DEFAULT '[]'::jsonb,

  -- Specific venues they loved (with ratings)
  -- Example: [{"name": "Lucky Strike", "rating": 5, "visits": 2}]
  liked_venues JSONB DEFAULT '[]'::jsonb,

  -- Plan structures that got positive feedback
  -- Example: ["activity_then_dinner", "brunch_and_explore"]
  liked_plan_structures JSONB DEFAULT '[]'::jsonb,

  -- ==========================================
  -- NEGATIVE PATTERNS (What didn't work)
  -- ==========================================

  -- Activity types they disliked
  disliked_activity_types JSONB DEFAULT '[]'::jsonb,

  -- Time slots that didn't work
  disliked_time_slots JSONB DEFAULT '[]'::jsonb,

  -- Venues to avoid
  disliked_venues JSONB DEFAULT '[]'::jsonb,

  -- Reasons for negative feedback (for AI learning)
  -- Example: ["too_crowded", "too_expensive", "too_far"]
  negative_feedback_reasons JSONB DEFAULT '[]'::jsonb,

  -- ==========================================
  -- STATISTICAL PATTERNS
  -- ==========================================

  -- Average number of activities in plans they liked
  avg_activities_liked DECIMAL(3,1),

  -- Average plan duration they prefer (hours)
  avg_duration_liked DECIMAL(3,1),

  -- Average distance they're comfortable with (miles)
  avg_distance_liked DECIMAL(4,1),

  -- Total plans generated
  total_plans_generated INTEGER DEFAULT 0,

  -- Plans with positive feedback
  positive_feedback_count INTEGER DEFAULT 0,

  -- Plans with negative feedback
  negative_feedback_count INTEGER DEFAULT 0,

  -- ==========================================
  -- TIMESTAMPS
  -- ==========================================

  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. ONBOARDING RESPONSES TABLE
-- ============================================
-- Stores individual onboarding question responses for reference

CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  question_id TEXT NOT NULL,
  question_text TEXT NOT NULL,
  response_value TEXT NOT NULL,
  response_label TEXT, -- Human-readable version

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_plan_patterns_user_id ON plan_patterns(user_id);
CREATE INDEX idx_onboarding_responses_user_id ON onboarding_responses(user_id);

-- GIN indexes for JSONB columns (for efficient querying)
CREATE INDEX idx_user_profiles_interests ON user_profiles USING GIN (inferred_interests);
CREATE INDEX idx_user_profiles_dislikes ON user_profiles USING GIN (inferred_dislikes);
CREATE INDEX idx_plan_patterns_liked_activities ON plan_patterns USING GIN (liked_activity_types);

-- ============================================
-- 5. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Plan Patterns Policies
CREATE POLICY "Users can view own patterns"
  ON plan_patterns FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own patterns"
  ON plan_patterns FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own patterns"
  ON plan_patterns FOR UPDATE
  USING (auth.uid() = user_id);

-- Onboarding Responses Policies
CREATE POLICY "Users can view own responses"
  ON onboarding_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON onboarding_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_patterns_updated_at
  BEFORE UPDATE ON plan_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to calculate profile completeness
CREATE OR REPLACE FUNCTION calculate_profile_completeness(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completeness INTEGER := 0;
  profile_row user_profiles%ROWTYPE;
BEGIN
  SELECT * INTO profile_row FROM user_profiles WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  -- Base traits (5 points each = 25 points)
  IF profile_row.introvert_extrovert != 5 THEN completeness := completeness + 5; END IF;
  IF profile_row.spontaneous_planner != 5 THEN completeness := completeness + 5; END IF;
  IF profile_row.adventurous_comfort != 5 THEN completeness := completeness + 5; END IF;
  IF profile_row.energy_level != 5 THEN completeness := completeness + 5; END IF;
  IF profile_row.decisiveness != 5 THEN completeness := completeness + 5; END IF;

  -- Social preferences (5 points each = 15 points)
  IF profile_row.preferred_group_size != 'flexible' THEN completeness := completeness + 5; END IF;
  IF profile_row.social_openness != 'moderate' THEN completeness := completeness + 5; END IF;
  IF profile_row.social_context != 'mixed' THEN completeness := completeness + 5; END IF;

  -- Practical preferences (5 points each = 20 points)
  IF profile_row.budget_sensitivity != 'moderate' THEN completeness := completeness + 5; END IF;
  IF profile_row.time_preference != 'flexible' THEN completeness := completeness + 5; END IF;
  IF profile_row.crowd_tolerance != 'moderate' THEN completeness := completeness + 5; END IF;
  IF profile_row.pace_preference != 'balanced' THEN completeness := completeness + 5; END IF;

  -- AI-inferred data (10 points each = 40 points)
  IF jsonb_array_length(profile_row.inferred_interests) > 0 THEN completeness := completeness + 10; END IF;
  IF jsonb_array_length(profile_row.inferred_dislikes) > 0 THEN completeness := completeness + 10; END IF;
  IF profile_row.mood_signals != '{}'::jsonb THEN completeness := completeness + 10; END IF;
  IF profile_row.food_preferences != '{}'::jsonb THEN completeness := completeness + 10; END IF;

  RETURN completeness;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create profile on user signup
CREATE OR REPLACE FUNCTION create_user_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO plan_patterns (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile_on_signup();

-- ============================================
-- USAGE EXAMPLES
-- ============================================

/*
-- Get user's full profile for AI context
SELECT
  up.*,
  pp.liked_activity_types,
  pp.disliked_activity_types,
  pp.avg_activities_liked
FROM user_profiles up
LEFT JOIN plan_patterns pp ON up.user_id = pp.user_id
WHERE up.user_id = 'USER_UUID_HERE';

-- Update personality trait after onboarding
UPDATE user_profiles
SET
  introvert_extrovert = 3,
  energy_level = 7,
  onboarding_step = 2
WHERE user_id = 'USER_UUID_HERE';

-- Add inferred interest from AI analysis
UPDATE user_profiles
SET
  inferred_interests = inferred_interests || '["bowling"]'::jsonb,
  last_ai_analysis = NOW()
WHERE user_id = 'USER_UUID_HERE';

-- Record positive venue feedback
UPDATE plan_patterns
SET
  liked_venues = liked_venues || '[{"name": "Lucky Strike", "rating": 5}]'::jsonb,
  positive_feedback_count = positive_feedback_count + 1
WHERE user_id = 'USER_UUID_HERE';
*/
