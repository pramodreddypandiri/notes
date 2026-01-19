import { supabase } from '../config/supabase';
import { parseNote } from './claudeService';
import notificationService from './notificationService';

// Keywords that indicate a reminder intent
const REMINDER_KEYWORDS = [
  'remind', 'reminder', 'remember',
  'don\'t forget', 'dont forget',
  'call', 'email', 'text', 'message',
  'meeting', 'appointment',
  'pick up', 'buy', 'get',
  'schedule', 'book',
];

// Check if transcript contains reminder intent
const hasReminderIntent = (transcript: string): boolean => {
  const lower = transcript.toLowerCase();
  return REMINDER_KEYWORDS.some(keyword => lower.includes(keyword));
};

// Determine appropriate tags based on parsed data
const determineTags = (
  parsedData: any,
  transcript: string
): string[] => {
  const tags: string[] = [];

  // If time is mentioned and has reminder intent, tag as reminder
  if (parsedData.time && hasReminderIntent(transcript)) {
    tags.push('reminder');
  } else if (parsedData.type === 'task') {
    tags.push('reminder');
  } else if (parsedData.type === 'preference') {
    tags.push('preference');
  } else if (parsedData.food || parsedData.activity) {
    tags.push('my_type');
  }

  return tags;
};

export interface CreateNoteOptions {
  transcript: string;
  audioUrl?: string;
  forceReminder?: boolean;
  customReminderTime?: Date;
}

export interface CreateNoteResult {
  note: any;
  reminderScheduled: boolean;
  reminderTime?: string;
  notificationId?: string;
}

export const createNote = async (
  transcript: string,
  audioUrl?: string
): Promise<any> => {
  const result = await createNoteWithReminder({ transcript, audioUrl });
  return result.note;
};

export const createNoteWithReminder = async (
  options: CreateNoteOptions
): Promise<CreateNoteResult> => {
  const { transcript, audioUrl, forceReminder, customReminderTime } = options;

  try {
    // Parse the transcript with Claude
    const parsedData = await parseNote(transcript);

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Determine tags
    const tags = determineTags(parsedData, transcript);
    const isReminder = forceReminder || tags.includes('reminder');

    // Prepare note data
    const noteData: any = {
      user_id: user.id,
      transcript,
      audio_url: audioUrl,
      parsed_data: parsedData,
      tags,
    };

    let notificationId: string | null = null;
    let reminderDisplayText: string | undefined;

    // Helper to check if a date is valid
    const isValidDate = (date: Date): boolean => {
      return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > 0;
    };

    // Schedule reminder if applicable
    if (isReminder) {
      if (customReminderTime && isValidDate(customReminderTime)) {
        // Use custom time provided by user
        notificationId = await notificationService.scheduleReminderForDate(
          parsedData.summary || transcript,
          '', // Note ID not available yet
          customReminderTime
        );
        reminderDisplayText = notificationService.formatReminderDisplay(customReminderTime);
        noteData.reminder_time = customReminderTime.toISOString();
      } else if (parsedData.time) {
        // Parse time from Claude's extraction
        const { notificationId: nId, reminderInfo } = await notificationService.scheduleReminderFromNote(
          parsedData.summary || transcript,
          parsedData.time
        );
        if (reminderInfo.isValid && isValidDate(reminderInfo.date)) {
          notificationId = nId;
          reminderDisplayText = reminderInfo.displayText;
          noteData.reminder_time = reminderInfo.date.toISOString();
        }
      }

      if (notificationId) {
        noteData.notification_id = notificationId;
      }
    }

    // Insert into database
    const { data, error } = await supabase
      .from('notes')
      .insert(noteData)
      .select()
      .single();

    if (error) throw error;

    return {
      note: data,
      reminderScheduled: !!notificationId,
      reminderTime: reminderDisplayText,
      notificationId: notificationId || undefined,
    };
  } catch (error) {
    console.error('Failed to create note:', error);
    throw error;
  }
};

export const updateNoteReminder = async (
  noteId: string,
  reminderTime: Date
): Promise<{ success: boolean; notificationId?: string; reminderDisplay?: string }> => {
  try {
    // Get the note first
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (fetchError) throw fetchError;

    // Cancel existing notification if any
    if (note.notification_id) {
      await notificationService.cancelNotification(note.notification_id);
    }

    // Schedule new notification
    const notificationId = await notificationService.scheduleReminderForDate(
      note.parsed_data?.summary || note.transcript,
      noteId,
      reminderTime
    );

    // Update note with new reminder info
    const currentTags = note.tags || [];
    const newTags = currentTags.includes('reminder')
      ? currentTags
      : [...currentTags, 'reminder'];

    const { error: updateError } = await supabase
      .from('notes')
      .update({
        reminder_time: reminderTime.toISOString(),
        notification_id: notificationId,
        tags: newTags,
      })
      .eq('id', noteId);

    if (updateError) throw updateError;

    return {
      success: true,
      notificationId: notificationId || undefined,
      reminderDisplay: notificationService.formatReminderDisplay(reminderTime),
    };
  } catch (error) {
    console.error('Failed to update note reminder:', error);
    return { success: false };
  }
};

export const removeNoteReminder = async (noteId: string): Promise<boolean> => {
  try {
    // Get the note first
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (fetchError) throw fetchError;

    // Cancel existing notification if any
    if (note.notification_id) {
      await notificationService.cancelNotification(note.notification_id);
    }

    // Remove reminder tag and clear reminder fields
    const newTags = (note.tags || []).filter((t: string) => t !== 'reminder');

    const { error: updateError } = await supabase
      .from('notes')
      .update({
        reminder_time: null,
        notification_id: null,
        tags: newTags,
      })
      .eq('id', noteId);

    if (updateError) throw updateError;

    return true;
  } catch (error) {
    console.error('Failed to remove note reminder:', error);
    return false;
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

export const updateNoteTags = async (
  noteId: string,
  tags: string[]
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notes')
      .update({ tags })
      .eq('id', noteId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to update note tags:', error);
    return false;
  }
};

export const deleteNote = async (noteId: string) => {
  try {
    // Get the note first to cancel any scheduled notification
    const { data: note } = await supabase
      .from('notes')
      .select('notification_id')
      .eq('id', noteId)
      .single();

    // Cancel notification if exists
    if (note?.notification_id) {
      await notificationService.cancelNotification(note.notification_id);
    }

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
