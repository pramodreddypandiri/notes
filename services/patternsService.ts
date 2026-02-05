import { supabase } from '../config/supabase';

export type PatternType = 'recurring_activity' | 'time_preference' | 'location_preference' | 'store_preference';

export interface Pattern {
  id: string;
  user_id: string;
  pattern_type: PatternType;
  activity: string;
  occurrences: number;
  last_occurrence: string | null;
  typical_day_of_week: number | null; // 0=Sunday, 6=Saturday
  typical_time: string | null; // HH:MM format
  typical_location: string | null;
  preferred_store: string | null;
  confidence: number; // 0-1
  suggestion: string | null;
  suggestion_shown_at: string | null;
  suggestion_accepted: boolean | null;
  suggestion_dismissed: boolean;
  related_note_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DetectedPattern {
  pattern_type: PatternType;
  activity: string;
  occurrences: number;
  typical_day_of_week?: number;
  typical_time?: string;
  typical_location?: string;
  preferred_store?: string;
  confidence: number;
  suggestion?: string;
  related_note_ids?: string[];
}

// Minimum occurrences needed to consider something a pattern
const MIN_OCCURRENCES_FOR_PATTERN = 2;
// Minimum confidence to show suggestions
const MIN_CONFIDENCE_FOR_SUGGESTION = 0.6;

class PatternsService {
  /**
   * Get all patterns for the current user
   */
  async getPatterns(): Promise<Pattern[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('user_id', user.id)
        .order('confidence', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching patterns:', error);
      return [];
    }
  }

  /**
   * Get high-confidence patterns suitable for suggestions
   */
  async getSuggestablePatterns(): Promise<Pattern[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('patterns')
        .select('*')
        .eq('user_id', user.id)
        .gte('confidence', MIN_CONFIDENCE_FOR_SUGGESTION)
        .eq('suggestion_dismissed', false)
        .is('suggestion_accepted', null)
        .order('confidence', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching suggestable patterns:', error);
      return [];
    }
  }

  /**
   * Save or update a detected pattern
   */
  async savePattern(pattern: DetectedPattern): Promise<Pattern | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Upsert based on unique constraint (user_id, pattern_type, activity)
      const { data, error } = await supabase
        .from('patterns')
        .upsert({
          user_id: user.id,
          pattern_type: pattern.pattern_type,
          activity: pattern.activity,
          occurrences: pattern.occurrences,
          last_occurrence: new Date().toISOString(),
          typical_day_of_week: pattern.typical_day_of_week ?? null,
          typical_time: pattern.typical_time ?? null,
          typical_location: pattern.typical_location ?? null,
          preferred_store: pattern.preferred_store ?? null,
          confidence: pattern.confidence,
          suggestion: pattern.suggestion ?? null,
          related_note_ids: pattern.related_note_ids ?? null,
        }, {
          onConflict: 'user_id,pattern_type,activity',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving pattern:', error);
      return null;
    }
  }

  /**
   * Record that a suggestion was shown to the user
   */
  async markSuggestionShown(patternId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('patterns')
        .update({ suggestion_shown_at: new Date().toISOString() })
        .eq('id', patternId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking suggestion shown:', error);
      return false;
    }
  }

  /**
   * Record user's response to a suggestion
   */
  async recordSuggestionResponse(
    patternId: string,
    accepted: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('patterns')
        .update({
          suggestion_accepted: accepted,
          suggestion_dismissed: !accepted,
        })
        .eq('id', patternId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error recording suggestion response:', error);
      return false;
    }
  }

  /**
   * Analyze notes to detect patterns
   * This should run periodically (e.g., daily at 3am)
   */
  async detectPatterns(): Promise<DetectedPattern[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get notes from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: notes, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!notes || notes.length === 0) return [];

      const detectedPatterns: DetectedPattern[] = [];

      // Detect recurring activities by location category
      const locationPatterns = this.detectLocationPatterns(notes);
      detectedPatterns.push(...locationPatterns);

      // Detect time preferences
      const timePatterns = this.detectTimePatterns(notes);
      detectedPatterns.push(...timePatterns);

      // Detect store preferences from transcript analysis
      const storePatterns = this.detectStorePreferences(notes);
      detectedPatterns.push(...storePatterns);

      // Save all detected patterns
      for (const pattern of detectedPatterns) {
        await this.savePattern(pattern);
      }

      return detectedPatterns;
    } catch (error) {
      console.error('Error detecting patterns:', error);
      return [];
    }
  }

  /**
   * Detect patterns based on location categories
   */
  private detectLocationPatterns(notes: any[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const locationGroups: Record<string, any[]> = {};

    // Group notes by location category
    for (const note of notes) {
      if (note.location_category) {
        if (!locationGroups[note.location_category]) {
          locationGroups[note.location_category] = [];
        }
        locationGroups[note.location_category].push(note);
      }
    }

    // Analyze each location category
    for (const [category, categoryNotes] of Object.entries(locationGroups)) {
      if (categoryNotes.length >= MIN_OCCURRENCES_FOR_PATTERN) {
        // Find most common day of week
        const dayOfWeekCounts = new Array(7).fill(0);
        for (const note of categoryNotes) {
          const day = new Date(note.created_at).getDay();
          dayOfWeekCounts[day]++;
        }
        const typicalDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
        const dayConfidence = dayOfWeekCounts[typicalDay] / categoryNotes.length;

        // Calculate overall confidence
        const confidence = Math.min(
          (categoryNotes.length / 5) * dayConfidence, // More occurrences = higher confidence
          1.0
        );

        if (confidence >= MIN_CONFIDENCE_FOR_SUGGESTION) {
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          patterns.push({
            pattern_type: 'recurring_activity',
            activity: category,
            occurrences: categoryNotes.length,
            typical_day_of_week: typicalDay,
            confidence,
            suggestion: `You usually do ${category} errands on ${dayNames[typicalDay]}s. Want a reminder?`,
            related_note_ids: categoryNotes.map(n => n.id),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect time preference patterns
   */
  private detectTimePatterns(notes: any[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Analyze reminder notes for time preferences
    const reminderNotes = notes.filter(n => n.is_reminder && n.recurrence_time);

    if (reminderNotes.length >= MIN_OCCURRENCES_FOR_PATTERN) {
      // Group by hour
      const hourCounts: Record<string, number> = {};
      for (const note of reminderNotes) {
        const hour = note.recurrence_time.split(':')[0];
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }

      // Find most common reminder time
      let maxHour = '';
      let maxCount = 0;
      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count > maxCount) {
          maxCount = count;
          maxHour = hour;
        }
      }

      const confidence = maxCount / reminderNotes.length;
      if (confidence >= MIN_CONFIDENCE_FOR_SUGGESTION && maxHour) {
        const hourNum = parseInt(maxHour, 10);
        const period = hourNum >= 12 ? 'PM' : 'AM';
        const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);

        patterns.push({
          pattern_type: 'time_preference',
          activity: 'reminder_scheduling',
          occurrences: maxCount,
          typical_time: `${maxHour}:00`,
          confidence,
          suggestion: `You often set reminders for ${displayHour} ${period}. Want this as your default?`,
        });
      }
    }

    return patterns;
  }

  /**
   * Detect store preferences from note transcripts
   */
  private detectStorePreferences(notes: any[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Common store names to look for
    const stores = [
      'target', 'walmart', 'costco', 'whole foods', 'trader joe',
      'safeway', 'kroger', 'publix', 'aldi', 'heb',
      'walgreens', 'cvs', 'rite aid',
      'home depot', 'lowes', 'ace hardware',
      'amazon', 'best buy'
    ];

    const storeCounts: Record<string, { count: number; noteIds: string[] }> = {};

    for (const note of notes) {
      const transcript = (note.transcript || '').toLowerCase();
      for (const store of stores) {
        if (transcript.includes(store)) {
          if (!storeCounts[store]) {
            storeCounts[store] = { count: 0, noteIds: [] };
          }
          storeCounts[store].count++;
          storeCounts[store].noteIds.push(note.id);
        }
      }
    }

    // Find stores mentioned multiple times
    for (const [store, data] of Object.entries(storeCounts)) {
      if (data.count >= MIN_OCCURRENCES_FOR_PATTERN) {
        const confidence = Math.min(data.count / 5, 1.0);

        if (confidence >= MIN_CONFIDENCE_FOR_SUGGESTION) {
          const formattedStore = store.split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

          patterns.push({
            pattern_type: 'store_preference',
            activity: 'shopping',
            occurrences: data.count,
            preferred_store: formattedStore,
            confidence,
            suggestion: `You frequently mention ${formattedStore}. Want me to prioritize it for shopping tasks?`,
            related_note_ids: data.noteIds,
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Delete a pattern
   */
  async deletePattern(patternId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('patterns')
        .delete()
        .eq('id', patternId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting pattern:', error);
      return false;
    }
  }

  /**
   * Clear all patterns for current user
   */
  async clearAllPatterns(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase
        .from('patterns')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing patterns:', error);
      return false;
    }
  }
}

export default new PatternsService();
