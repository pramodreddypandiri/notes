import { supabase } from '../config/supabase';
import { parseNote } from './claudeService';

export const createNote = async (transcript: string, audioUrl?: string) => {
  try {
    // Parse the transcript with Claude
    const parsedData = await parseNote(transcript);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Insert into database
    const { data, error } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        transcript,
        audio_url: audioUrl,
        parsed_data: parsedData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
};

export const getNotes = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get notes:', error);
    throw error;
  }
};

export const getRecentNotes = async (days = 7) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get recent notes:', error);
    throw error;
  }
};

export const deleteNote = async (noteId: string) => {
  try {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to delete note:', error);
    throw error;
  }
};