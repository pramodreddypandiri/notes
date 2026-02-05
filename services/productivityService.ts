import { supabase } from '../config/supabase';
import preferencesService from './preferencesService';

export interface ProductivityMetrics {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  tasks_created: number;
  tasks_completed: number;
  tasks_rolled_over: number;
  completion_rate: number | null; // 0-100 percentage
  most_productive_hour: number | null; // 0-23
  avg_completion_time_minutes: number | null;
  notes_recorded: number;
  voice_notes_count: number;
  text_notes_count: number;
  patterns_detected: number;
  streak_day: number;
  streak_broken: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyStats {
  date: Date;
  tasksCreated: number;
  tasksCompleted: number;
  completionRate: number;
  streak: number;
}

export interface WeeklyTrend {
  weekStart: Date;
  avgCompletionRate: number;
  totalTasksCreated: number;
  totalTasksCompleted: number;
  mostProductiveDay: string;
}

class ProductivityService {
  /**
   * Calculate and save daily metrics
   */
  async calculateDailyMetrics(date: Date = new Date()): Promise<ProductivityMetrics | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const dateStr = this.formatDate(date);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get tasks created today
      const { data: createdTasks } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .in('note_type', ['task', 'reminder'])
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      // Get tasks completed today
      const { data: completedTasks } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .in('note_type', ['task', 'reminder'])
        .gte('completed_at', startOfDay.toISOString())
        .lte('completed_at', endOfDay.toISOString());

      // Get all notes recorded today
      const { data: allNotes } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());

      const tasksCreated = createdTasks?.length || 0;
      const tasksCompleted = completedTasks?.length || 0;
      const completionRate = tasksCreated > 0 ? (tasksCompleted / tasksCreated) * 100 : null;

      // Count voice vs text notes
      const voiceNotes = allNotes?.filter(n => n.input_method === 'voice' || n.audio_url).length || 0;
      const textNotes = allNotes?.filter(n => n.input_method === 'text' || (!n.audio_url && n.input_method !== 'voice')).length || 0;

      // Find most productive hour (hour with most completions)
      let mostProductiveHour: number | null = null;
      if (completedTasks && completedTasks.length > 0) {
        const hourCounts = new Array(24).fill(0);
        for (const task of completedTasks) {
          const hour = new Date(task.completed_at).getHours();
          hourCounts[hour]++;
        }
        mostProductiveHour = hourCounts.indexOf(Math.max(...hourCounts));
      }

      // Calculate streak
      const streak = await this.calculateStreak(user.id, date);
      const previousStreak = await this.getPreviousDayStreak(user.id, date);
      const streakBroken = previousStreak > 0 && completionRate !== null && completionRate < 50;

      // Upsert metrics
      const { data, error } = await supabase
        .from('productivity_metrics')
        .upsert({
          user_id: user.id,
          date: dateStr,
          tasks_created: tasksCreated,
          tasks_completed: tasksCompleted,
          completion_rate: completionRate,
          most_productive_hour: mostProductiveHour,
          notes_recorded: allNotes?.length || 0,
          voice_notes_count: voiceNotes,
          text_notes_count: textNotes,
          streak_day: streak,
          streak_broken: streakBroken,
        }, {
          onConflict: 'user_id,date',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error calculating daily metrics:', error);
      return null;
    }
  }

  /**
   * Get metrics for a specific date
   */
  async getMetricsForDate(date: Date): Promise<ProductivityMetrics | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const dateStr = this.formatDate(date);

      const { data, error } = await supabase
        .from('productivity_metrics')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return null;
    }
  }

  /**
   * Get metrics for the last N days
   */
  async getRecentMetrics(days: number = 7): Promise<ProductivityMetrics[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('productivity_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', this.formatDate(startDate))
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching recent metrics:', error);
      return [];
    }
  }

  /**
   * Calculate current streak
   */
  private async calculateStreak(userId: string, date: Date): Promise<number> {
    try {
      let streak = 0;
      let checkDate = new Date(date);
      checkDate.setDate(checkDate.getDate() - 1); // Start from yesterday

      while (true) {
        const dateStr = this.formatDate(checkDate);

        const { data } = await supabase
          .from('productivity_metrics')
          .select('completion_rate')
          .eq('user_id', userId)
          .eq('date', dateStr)
          .single();

        // If no data or completion rate below 50%, streak ends
        if (!data || data.completion_rate === null || data.completion_rate < 50) {
          break;
        }

        streak++;
        checkDate.setDate(checkDate.getDate() - 1);

        // Safety limit
        if (streak > 365) break;
      }

      return streak;
    } catch (error) {
      console.error('Error calculating streak:', error);
      return 0;
    }
  }

  /**
   * Get streak from previous day
   */
  private async getPreviousDayStreak(userId: string, date: Date): Promise<number> {
    try {
      const yesterday = new Date(date);
      yesterday.setDate(yesterday.getDate() - 1);

      const { data } = await supabase
        .from('productivity_metrics')
        .select('streak_day')
        .eq('user_id', userId)
        .eq('date', this.formatDate(yesterday))
        .single();

      return data?.streak_day || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get pending tasks for today (for bedtime notification)
   */
  async getPendingTasksForToday(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get tasks that are:
      // 1. Created today and not completed
      // 2. OR have event_date today and not completed
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .in('note_type', ['task', 'reminder'])
        .is('completed_at', null)
        .or(`created_at.gte.${today.toISOString()},event_date.eq.${this.formatDate(today)}`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return [];
    }
  }

  /**
   * Check if bedtime reminder should be sent
   */
  async shouldSendBedtimeReminder(): Promise<{ send: boolean; message: { title: string; body: string } | null }> {
    try {
      const prefs = await preferencesService.getPreferences();
      if (!prefs?.enable_bedtime_reminder) {
        return { send: false, message: null };
      }

      const pendingTasks = await this.getPendingTasksForToday();

      if (pendingTasks.length === 0) {
        return { send: false, message: null };
      }

      // Get today's completion stats
      const todayMetrics = await this.calculateDailyMetrics();
      const completedCount = todayMetrics?.tasks_completed || 0;

      const message = preferencesService.getNotificationMessage('bedtime_summary', {
        taskCount: pendingTasks.length,
        completedCount,
      });

      return { send: true, message };
    } catch (error) {
      console.error('Error checking bedtime reminder:', error);
      return { send: false, message: null };
    }
  }

  /**
   * Generate morning briefing content
   */
  async getMorningBriefing(): Promise<{ title: string; body: string } | null> {
    try {
      const prefs = await preferencesService.getPreferences();
      if (!prefs?.enable_morning_briefing) {
        return null;
      }

      const pendingTasks = await this.getPendingTasksForToday();

      return preferencesService.getNotificationMessage('morning_briefing', {
        taskCount: pendingTasks.length,
      });
    } catch (error) {
      console.error('Error generating morning briefing:', error);
      return null;
    }
  }

  /**
   * Get weekly trend analysis
   */
  async getWeeklyTrend(): Promise<WeeklyTrend | null> {
    try {
      const metrics = await this.getRecentMetrics(7);
      if (metrics.length === 0) return null;

      const totalCreated = metrics.reduce((sum, m) => sum + m.tasks_created, 0);
      const totalCompleted = metrics.reduce((sum, m) => sum + m.tasks_completed, 0);
      const avgRate = totalCreated > 0 ? (totalCompleted / totalCreated) * 100 : 0;

      // Find most productive day
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let maxCompleted = 0;
      let mostProductiveDay = '';

      for (const m of metrics) {
        if (m.tasks_completed > maxCompleted) {
          maxCompleted = m.tasks_completed;
          mostProductiveDay = dayNames[new Date(m.date).getDay()];
        }
      }

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      return {
        weekStart,
        avgCompletionRate: avgRate,
        totalTasksCreated: totalCreated,
        totalTasksCompleted: totalCompleted,
        mostProductiveDay: mostProductiveDay || 'N/A',
      };
    } catch (error) {
      console.error('Error calculating weekly trend:', error);
      return null;
    }
  }

  /**
   * Get current streak count
   */
  async getCurrentStreak(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      // Get most recent metrics
      const { data } = await supabase
        .from('productivity_metrics')
        .select('streak_day')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(1)
        .single();

      return data?.streak_day || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

export default new ProductivityService();
