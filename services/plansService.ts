import { supabase } from '../config/supabase';
import { generateWeekendPlans } from './claudeService';
import { getRecentNotes } from './notesService';

export const createWeekendPlans = async (
  userLocation: { lat: number; lng: number; city: string }
) => {
  try {
    // Get user's recent notes
    const notes = await getRecentNotes(7);

    // Get past feedback
    const { data: feedback } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Generate plans with Claude
    const plans = await generateWeekendPlans(notes, userLocation, feedback || []);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get next weekend date
    const today = new Date();
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + daysUntilSaturday);

    // Save plans to database
    const savedPlans = [];
    for (const plan of plans) {
      const { data, error } = await supabase
        .from('plans')
        .insert({
          user_id: user.id,
          plan_data: plan,
          for_date: nextSaturday.toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      savedPlans.push(data);
    }

    return savedPlans;
  } catch (error) {
    console.error('Failed to create weekend plans:', error);
    throw error;
  }
};

export const getPlans = async () => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get plans:', error);
    throw error;
  }
};

export const submitFeedback = async (
  planId: string,
  rating: 'up' | 'down',
  reason?: string
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        plan_id: planId,
        rating,
        reason,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    throw error;
  }
};