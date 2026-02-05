import { supabase } from '../config/supabase';

export type NotificationTone = 'friendly' | 'neutral' | 'motivational';

export interface UserPreferences {
  id: string;
  user_id: string;
  wake_time: string; // Format: "HH:MM"
  sleep_time: string; // Format: "HH:MM"
  notification_tone: NotificationTone;
  enable_bedtime_reminder: boolean;
  enable_pattern_suggestions: boolean;
  enable_morning_briefing: boolean;
  geofence_radius: number; // in meters
  enable_location_reminders: boolean;
  store_audio_files: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesInput {
  wake_time?: string;
  sleep_time?: string;
  notification_tone?: NotificationTone;
  enable_bedtime_reminder?: boolean;
  enable_pattern_suggestions?: boolean;
  enable_morning_briefing?: boolean;
  geofence_radius?: number;
  enable_location_reminders?: boolean;
  store_audio_files?: boolean;
}

const DEFAULT_PREFERENCES: Omit<UserPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  wake_time: '07:00',
  sleep_time: '22:00',
  notification_tone: 'friendly',
  enable_bedtime_reminder: true,
  enable_pattern_suggestions: true,
  enable_morning_briefing: false,
  geofence_radius: 152, // ~500 feet
  enable_location_reminders: true,
  store_audio_files: true,
};

class PreferencesService {
  private cachedPreferences: UserPreferences | null = null;
  private cacheUserId: string | null = null;

  /**
   * Get user preferences, creating default preferences if none exist
   */
  async getPreferences(): Promise<UserPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Return cached if same user
      if (this.cachedPreferences && this.cacheUserId === user.id) {
        return this.cachedPreferences;
      }

      // Try to fetch existing preferences
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned
        console.error('Error fetching preferences:', error);
        return null;
      }

      if (data) {
        this.cachedPreferences = data;
        this.cacheUserId = user.id;
        return data;
      }

      // Create default preferences for new user
      const newPreferences = await this.createDefaultPreferences(user.id);
      return newPreferences;
    } catch (error) {
      console.error('Error in getPreferences:', error);
      return null;
    }
  }

  /**
   * Create default preferences for a new user
   */
  private async createDefaultPreferences(userId: string): Promise<UserPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...DEFAULT_PREFERENCES,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating default preferences:', error);
        return null;
      }

      this.cachedPreferences = data;
      this.cacheUserId = userId;
      return data;
    } catch (error) {
      console.error('Error in createDefaultPreferences:', error);
      return null;
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(updates: UpdatePreferencesInput): Promise<UserPreferences | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating preferences:', error);
        return null;
      }

      this.cachedPreferences = data;
      this.cacheUserId = user.id;
      return data;
    } catch (error) {
      console.error('Error in updatePreferences:', error);
      return null;
    }
  }

  /**
   * Check if current time is within user's active hours
   */
  async isWithinActiveHours(): Promise<boolean> {
    const prefs = await this.getPreferences();
    if (!prefs) return true; // Default to allowing notifications

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return this.isTimeInRange(currentTime, prefs.wake_time, prefs.sleep_time);
  }

  /**
   * Check if a time is within a range (handles overnight ranges)
   */
  private isTimeInRange(time: string, start: string, end: string): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(start);
    const endMinutes = this.timeToMinutes(end);

    if (startMinutes <= endMinutes) {
      // Normal range (e.g., 07:00 to 22:00)
      return timeMinutes >= startMinutes && timeMinutes < endMinutes;
    } else {
      // Overnight range (e.g., 22:00 to 07:00)
      return timeMinutes >= startMinutes || timeMinutes < endMinutes;
    }
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Get notification message based on user's preferred tone
   */
  getNotificationMessage(
    type: 'bedtime_summary' | 'morning_briefing' | 'task_reminder' | 'pattern_suggestion',
    context: { taskCount?: number; completedCount?: number; taskTitle?: string; suggestion?: string }
  ): { title: string; body: string } {
    const tone = this.cachedPreferences?.notification_tone || 'friendly';

    const messages: Record<NotificationTone, Record<typeof type, { title: string; body: string }>> = {
      friendly: {
        bedtime_summary: {
          title: '🌙 Time to wind down!',
          body: context.taskCount === 0
            ? "You crushed it today! All tasks done. Sweet dreams! 😴"
            : `You completed ${context.completedCount} tasks today. ${context.taskCount} waiting for tomorrow. Rest up!`,
        },
        morning_briefing: {
          title: '☀️ Good morning!',
          body: context.taskCount === 0
            ? "Your day is clear! What would you like to accomplish?"
            : `You have ${context.taskCount} tasks lined up. Let's make today great!`,
        },
        task_reminder: {
          title: '📝 Friendly reminder',
          body: context.taskTitle || 'You have a task waiting!',
        },
        pattern_suggestion: {
          title: '💡 Quick thought',
          body: context.suggestion || 'I noticed something that might help!',
        },
      },
      neutral: {
        bedtime_summary: {
          title: 'End of Day Summary',
          body: context.taskCount === 0
            ? 'All tasks completed.'
            : `Completed: ${context.completedCount}. Pending: ${context.taskCount}.`,
        },
        morning_briefing: {
          title: 'Daily Briefing',
          body: context.taskCount === 0
            ? 'No tasks scheduled.'
            : `${context.taskCount} task(s) scheduled for today.`,
        },
        task_reminder: {
          title: 'Task Reminder',
          body: context.taskTitle || 'Pending task',
        },
        pattern_suggestion: {
          title: 'Suggestion',
          body: context.suggestion || 'Pattern detected.',
        },
      },
      motivational: {
        bedtime_summary: {
          title: '🏆 Champion\'s Recap!',
          body: context.taskCount === 0
            ? "100% completion rate! You're unstoppable! 🚀"
            : `${context.completedCount} wins today! ${context.taskCount} more chances to shine tomorrow!`,
        },
        morning_briefing: {
          title: '🔥 Rise and Conquer!',
          body: context.taskCount === 0
            ? "Fresh slate! Time to set some goals and crush them!"
            : `${context.taskCount} opportunities await! Let's dominate today!`,
        },
        task_reminder: {
          title: '⚡ Action Time!',
          body: context.taskTitle ? `Time to tackle: ${context.taskTitle}` : 'A task is calling your name!',
        },
        pattern_suggestion: {
          title: '🎯 Pro Tip',
          body: context.suggestion || 'I\'ve spotted a way to level up!',
        },
      },
    };

    return messages[tone][type];
  }

  /**
   * Clear cached preferences (call on logout)
   */
  clearCache(): void {
    this.cachedPreferences = null;
    this.cacheUserId = null;
  }
}

export default new PreferencesService();
