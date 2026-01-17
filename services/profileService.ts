/**
 * Profile Service - User personality traits and preferences management
 *
 * Handles:
 * - Profile CRUD operations
 * - Onboarding data collection
 * - Plan pattern tracking
 * - Profile completeness calculation
 */

import { supabase } from '../config/supabase';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  id: string;
  user_id: string;

  // Personality spectrum (1-10)
  introvert_extrovert: number;
  spontaneous_planner: number;
  adventurous_comfort: number;
  energy_level: number;
  decisiveness: number;

  // Social preferences
  preferred_group_size: 'solo' | 'couple' | 'small_group' | 'large_group' | 'flexible';
  social_openness: 'low' | 'moderate' | 'high';
  social_context: 'date_night' | 'friends' | 'family' | 'solo' | 'mixed';

  // Practical preferences
  budget_sensitivity: 'budget' | 'moderate' | 'splurge' | 'flexible';
  time_preference: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
  crowd_tolerance: 'low' | 'moderate' | 'high';
  pace_preference: 'relaxed' | 'balanced' | 'packed';
  max_travel_distance: number;

  // AI-inferred data
  inferred_interests: string[];
  inferred_dislikes: string[];
  mood_signals: MoodSignals;
  food_preferences: FoodPreferences;
  activity_frequency: Record<string, number>;

  // Metadata
  onboarding_completed: boolean;
  onboarding_step: number;
  profile_completeness: number;
  last_ai_analysis: string | null;
  notes_analyzed_count: number;
  created_at: string;
  updated_at: string;
}

export interface MoodSignals {
  stress_level?: 'low' | 'moderate' | 'high';
  seeking?: string; // e.g., "relaxation", "adventure", "connection"
  recent_theme?: string;
  energy_state?: 'tired' | 'normal' | 'energized';
}

export interface FoodPreferences {
  favorites?: string[];
  dietary?: string[];
  avoid?: string[];
  cuisine_adventurousness?: 'low' | 'moderate' | 'high';
}

export interface PlanPatterns {
  id: string;
  user_id: string;

  // Positive patterns
  liked_activity_types: string[];
  liked_time_slots: string[];
  liked_venues: VenuePreference[];
  liked_plan_structures: string[];

  // Negative patterns
  disliked_activity_types: string[];
  disliked_time_slots: string[];
  disliked_venues: string[];
  negative_feedback_reasons: string[];

  // Statistics
  avg_activities_liked: number | null;
  avg_duration_liked: number | null;
  avg_distance_liked: number | null;
  total_plans_generated: number;
  positive_feedback_count: number;
  negative_feedback_count: number;

  updated_at: string;
}

export interface VenuePreference {
  name: string;
  rating: number;
  visits?: number;
  type?: string;
}

export interface OnboardingResponse {
  question_id: string;
  question_text: string;
  response_value: string;
  response_label?: string;
}

// ============================================
// PROFILE CRUD OPERATIONS
// ============================================

/**
 * Get user's profile
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // Profile might not exist yet, create it
      if (error.code === 'PGRST116') {
        return await createUserProfile();
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return null;
  }
}

/**
 * Create initial profile for new user
 */
export async function createUserProfile(): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) throw error;

    // Also create plan_patterns entry
    await supabase
      .from('plan_patterns')
      .insert({ user_id: user.id })
      .select()
      .single();

    return data;
  } catch (error) {
    console.error('Failed to create user profile:', error);
    return null;
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  updates: Partial<UserProfile>
): Promise<UserProfile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Remove read-only fields
    const { id, user_id, created_at, updated_at, ...updateData } = updates as any;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to update user profile:', error);
    return null;
  }
}

/**
 * Update personality trait
 */
export async function updatePersonalityTrait(
  trait: keyof Pick<UserProfile,
    'introvert_extrovert' | 'spontaneous_planner' | 'adventurous_comfort' |
    'energy_level' | 'decisiveness'
  >,
  value: number
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Clamp value between 1-10
    const clampedValue = Math.max(1, Math.min(10, value));

    const { error } = await supabase
      .from('user_profiles')
      .update({ [trait]: clampedValue })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update personality trait:', error);
    return false;
  }
}

// ============================================
// ONBOARDING OPERATIONS
// ============================================

/**
 * Save onboarding response
 */
export async function saveOnboardingResponse(
  response: OnboardingResponse
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('onboarding_responses')
      .insert({
        user_id: user.id,
        ...response,
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to save onboarding response:', error);
    return false;
  }
}

/**
 * Update onboarding step
 */
export async function updateOnboardingStep(step: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_profiles')
      .update({ onboarding_step: step })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update onboarding step:', error);
    return false;
  }
}

/**
 * Complete onboarding
 */
export async function completeOnboarding(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_step: -1, // -1 indicates completed
      })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to complete onboarding:', error);
    return false;
  }
}

/**
 * Check if user needs onboarding
 */
export async function needsOnboarding(): Promise<boolean> {
  try {
    const profile = await getUserProfile();
    if (!profile) return true;
    return !profile.onboarding_completed;
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    return true;
  }
}

// ============================================
// PLAN PATTERNS OPERATIONS
// ============================================

/**
 * Get user's plan patterns
 */
export async function getPlanPatterns(): Promise<PlanPatterns | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('plan_patterns')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get plan patterns:', error);
    return null;
  }
}

/**
 * Record plan feedback
 */
export async function recordPlanFeedback(
  planId: string,
  rating: 'up' | 'down',
  planData: {
    activities?: string[];
    venues?: string[];
    duration?: number;
    timeSlot?: string;
  },
  reason?: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Get current patterns
    const patterns = await getPlanPatterns();
    if (!patterns) return false;

    const updates: Partial<PlanPatterns> = {
      total_plans_generated: patterns.total_plans_generated + 1,
    };

    if (rating === 'up') {
      updates.positive_feedback_count = patterns.positive_feedback_count + 1;

      // Add liked activities
      if (planData.activities) {
        const newActivities = [...new Set([
          ...patterns.liked_activity_types,
          ...planData.activities,
        ])];
        updates.liked_activity_types = newActivities;
      }

      // Add liked time slot
      if (planData.timeSlot) {
        const newSlots = [...new Set([
          ...patterns.liked_time_slots,
          planData.timeSlot,
        ])];
        updates.liked_time_slots = newSlots;
      }
    } else {
      updates.negative_feedback_count = patterns.negative_feedback_count + 1;

      // Track negative feedback reason
      if (reason) {
        const newReasons = [...new Set([
          ...patterns.negative_feedback_reasons,
          reason,
        ])];
        updates.negative_feedback_reasons = newReasons;
      }
    }

    const { error } = await supabase
      .from('plan_patterns')
      .update(updates)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to record plan feedback:', error);
    return false;
  }
}

/**
 * Record venue preference
 */
export async function recordVenuePreference(
  venue: VenuePreference,
  liked: boolean
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const patterns = await getPlanPatterns();
    if (!patterns) return false;

    if (liked) {
      // Check if venue already exists
      const existingIndex = patterns.liked_venues.findIndex(
        v => v.name.toLowerCase() === venue.name.toLowerCase()
      );

      let updatedVenues: VenuePreference[];
      if (existingIndex >= 0) {
        // Update existing venue
        updatedVenues = [...patterns.liked_venues];
        updatedVenues[existingIndex] = {
          ...updatedVenues[existingIndex],
          visits: (updatedVenues[existingIndex].visits || 0) + 1,
          rating: Math.max(updatedVenues[existingIndex].rating, venue.rating),
        };
      } else {
        // Add new venue
        updatedVenues = [...patterns.liked_venues, { ...venue, visits: 1 }];
      }

      await supabase
        .from('plan_patterns')
        .update({ liked_venues: updatedVenues })
        .eq('user_id', user.id);
    } else {
      // Add to disliked
      const dislikedVenues = [...new Set([
        ...patterns.disliked_venues,
        venue.name,
      ])];

      await supabase
        .from('plan_patterns')
        .update({ disliked_venues: dislikedVenues })
        .eq('user_id', user.id);
    }

    return true;
  } catch (error) {
    console.error('Failed to record venue preference:', error);
    return false;
  }
}

// ============================================
// AI-INFERRED DATA OPERATIONS
// ============================================

/**
 * Add inferred interest
 */
export async function addInferredInterest(interest: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await getUserProfile();
    if (!profile) return false;

    const normalizedInterest = interest.toLowerCase().trim();
    if (profile.inferred_interests.includes(normalizedInterest)) {
      return true; // Already exists
    }

    const updatedInterests = [...profile.inferred_interests, normalizedInterest];

    const { error } = await supabase
      .from('user_profiles')
      .update({ inferred_interests: updatedInterests })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to add inferred interest:', error);
    return false;
  }
}

/**
 * Add inferred dislike
 */
export async function addInferredDislike(dislike: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await getUserProfile();
    if (!profile) return false;

    const normalizedDislike = dislike.toLowerCase().trim();
    if (profile.inferred_dislikes.includes(normalizedDislike)) {
      return true; // Already exists
    }

    const updatedDislikes = [...profile.inferred_dislikes, normalizedDislike];

    const { error } = await supabase
      .from('user_profiles')
      .update({ inferred_dislikes: updatedDislikes })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to add inferred dislike:', error);
    return false;
  }
}

/**
 * Update mood signals
 */
export async function updateMoodSignals(
  signals: Partial<MoodSignals>
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await getUserProfile();
    if (!profile) return false;

    const updatedSignals = {
      ...profile.mood_signals,
      ...signals,
    };

    const { error } = await supabase
      .from('user_profiles')
      .update({ mood_signals: updatedSignals })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update mood signals:', error);
    return false;
  }
}

/**
 * Update activity frequency
 */
export async function incrementActivityFrequency(
  activity: string
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await getUserProfile();
    if (!profile) return false;

    const normalizedActivity = activity.toLowerCase().trim();
    const updatedFrequency = {
      ...profile.activity_frequency,
      [normalizedActivity]: (profile.activity_frequency[normalizedActivity] || 0) + 1,
    };

    const { error } = await supabase
      .from('user_profiles')
      .update({ activity_frequency: updatedFrequency })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update activity frequency:', error);
    return false;
  }
}

/**
 * Mark notes as analyzed
 */
export async function markNotesAnalyzed(count: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const profile = await getUserProfile();
    if (!profile) return false;

    const { error } = await supabase
      .from('user_profiles')
      .update({
        notes_analyzed_count: profile.notes_analyzed_count + count,
        last_ai_analysis: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to mark notes analyzed:', error);
    return false;
  }
}

// ============================================
// PROFILE CONTEXT FOR AI
// ============================================

/**
 * Build comprehensive profile context for AI plan generation
 */
export async function buildAIProfileContext(): Promise<string> {
  try {
    const profile = await getUserProfile();
    const patterns = await getPlanPatterns();

    if (!profile) {
      return 'No user profile available. Generate a balanced, general plan.';
    }

    const lines: string[] = ['## User Profile'];

    // Personality traits
    lines.push('\n### Personality:');
    lines.push(`- Social energy: ${describeScale(profile.introvert_extrovert, 'introverted', 'extroverted')}`);
    lines.push(`- Planning style: ${describeScale(profile.spontaneous_planner, 'likes to plan ahead', 'prefers spontaneity')}`);
    lines.push(`- Adventure level: ${describeScale(profile.adventurous_comfort, 'comfort-seeking', 'adventurous')}`);
    lines.push(`- Energy level: ${describeScale(profile.energy_level, 'prefers relaxed activities', 'enjoys high-energy activities')}`);

    // Social preferences
    lines.push('\n### Social Preferences:');
    lines.push(`- Typical group: ${formatGroupSize(profile.preferred_group_size)}`);
    lines.push(`- Social openness: ${profile.social_openness}`);
    lines.push(`- Context: ${profile.social_context.replace('_', ' ')}`);

    // Practical preferences
    lines.push('\n### Practical Preferences:');
    lines.push(`- Budget: ${profile.budget_sensitivity}`);
    lines.push(`- Preferred time: ${profile.time_preference}`);
    lines.push(`- Crowd tolerance: ${profile.crowd_tolerance}`);
    lines.push(`- Pace: ${profile.pace_preference}`);
    lines.push(`- Max travel: ${profile.max_travel_distance} miles`);

    // Interests and dislikes
    if (profile.inferred_interests.length > 0) {
      lines.push(`\n### Known Interests: ${profile.inferred_interests.join(', ')}`);
    }

    if (profile.inferred_dislikes.length > 0) {
      lines.push(`\n### Things to Avoid: ${profile.inferred_dislikes.join(', ')}`);
    }

    // Mood signals
    if (Object.keys(profile.mood_signals).length > 0) {
      lines.push('\n### Current Mood Signals:');
      if (profile.mood_signals.stress_level) {
        lines.push(`- Stress level: ${profile.mood_signals.stress_level}`);
      }
      if (profile.mood_signals.seeking) {
        lines.push(`- Seeking: ${profile.mood_signals.seeking}`);
      }
      if (profile.mood_signals.recent_theme) {
        lines.push(`- Recent theme in notes: ${profile.mood_signals.recent_theme}`);
      }
    }

    // Food preferences
    if (profile.food_preferences.favorites?.length) {
      lines.push(`\n### Food Preferences:`);
      lines.push(`- Favorites: ${profile.food_preferences.favorites.join(', ')}`);
      if (profile.food_preferences.avoid?.length) {
        lines.push(`- Avoid: ${profile.food_preferences.avoid.join(', ')}`);
      }
      if (profile.food_preferences.dietary?.length) {
        lines.push(`- Dietary: ${profile.food_preferences.dietary.join(', ')}`);
      }
    }

    // Patterns from feedback
    if (patterns) {
      lines.push('\n### From Past Feedback:');

      if (patterns.liked_activity_types.length > 0) {
        lines.push(`- Enjoyed activities: ${patterns.liked_activity_types.join(', ')}`);
      }

      if (patterns.disliked_activity_types.length > 0) {
        lines.push(`- Didn't enjoy: ${patterns.disliked_activity_types.join(', ')}`);
      }

      if (patterns.liked_venues.length > 0) {
        const topVenues = patterns.liked_venues
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5)
          .map(v => v.name);
        lines.push(`- Favorite venues: ${topVenues.join(', ')}`);
      }

      if (patterns.negative_feedback_reasons.length > 0) {
        lines.push(`- Past complaints: ${patterns.negative_feedback_reasons.join(', ')}`);
      }

      if (patterns.avg_activities_liked) {
        lines.push(`- Preferred plan size: ~${patterns.avg_activities_liked} activities`);
      }
    }

    return lines.join('\n');
  } catch (error) {
    console.error('Failed to build AI profile context:', error);
    return 'No user profile available. Generate a balanced, general plan.';
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function describeScale(value: number, lowLabel: string, highLabel: string): string {
  if (value <= 3) return `strongly ${lowLabel} (${value}/10)`;
  if (value <= 4) return `somewhat ${lowLabel} (${value}/10)`;
  if (value === 5) return `balanced (${value}/10)`;
  if (value <= 7) return `somewhat ${highLabel} (${value}/10)`;
  return `strongly ${highLabel} (${value}/10)`;
}

function formatGroupSize(size: string): string {
  const labels: Record<string, string> = {
    solo: 'usually alone',
    couple: 'usually with partner',
    small_group: 'usually with 2-4 friends',
    large_group: 'enjoys larger groups (5+)',
    flexible: 'varies',
  };
  return labels[size] || size;
}

// Export default
export default {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  updatePersonalityTrait,
  saveOnboardingResponse,
  updateOnboardingStep,
  completeOnboarding,
  needsOnboarding,
  getPlanPatterns,
  recordPlanFeedback,
  recordVenuePreference,
  addInferredInterest,
  addInferredDislike,
  updateMoodSignals,
  incrementActivityFrequency,
  markNotesAnalyzed,
  buildAIProfileContext,
};
