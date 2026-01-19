import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications should be handled when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface ReminderInfo {
  date: Date;
  displayText: string;
  isValid: boolean;
}

class NotificationService {
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permission not granted');
        return false;
      }

      // For Android, create a notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Check if a date is valid
   */
  private isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime()) && date.getTime() > Date.now();
  }

  /**
   * Schedule a notification for a specific date/time
   */
  async scheduleNotification(
    title: string,
    body: string,
    scheduledDate: Date
  ): Promise<string | null> {
    try {
      // Validate the date
      if (!this.isValidDate(scheduledDate)) {
        console.warn('Invalid or past date for notification:', scheduledDate);
        return null;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Notification permission not granted');
      }

      // Calculate seconds until the scheduled date
      const secondsUntil = Math.max(1, Math.floor((scheduledDate.getTime() - Date.now()) / 1000));

      console.log('Scheduling notification for:', scheduledDate.toISOString());
      console.log('Seconds until notification:', secondsUntil);

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: { type: 'reminder' },
        },
        trigger: {
          seconds: secondsUntil,
          channelId: 'reminders',
        },
      });

      console.log('Notification scheduled:', notificationId, 'for', scheduledDate.toLocaleString());
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return null;
    }
  }

  /**
   * Schedule a reminder from note text
   * Parses natural language time (e.g., "Thursday at 9am")
   * Returns notification ID and reminder info
   */
  async scheduleReminderFromNote(
    noteText: string,
    reminderTime?: string
  ): Promise<{ notificationId: string | null; reminderInfo: ReminderInfo }> {
    try {
      const reminderInfo = reminderTime
        ? this.parseReminderTime(reminderTime)
        : { date: new Date(Date.now() + 60 * 60 * 1000), displayText: 'In 1 hour', isValid: true };

      const notificationId = await this.scheduleNotification(
        '⏰ Reminder',
        noteText,
        reminderInfo.date
      );

      return { notificationId, reminderInfo };
    } catch (error) {
      console.error('Failed to schedule reminder from note:', error);
      return {
        notificationId: null,
        reminderInfo: { date: new Date(), displayText: '', isValid: false }
      };
    }
  }

  /**
   * Schedule a reminder for a specific date
   */
  async scheduleReminderForDate(
    noteText: string,
    noteId: string,
    scheduledDate: Date
  ): Promise<string | null> {
    try {
      const notificationId = await this.scheduleNotification(
        '⏰ Reminder',
        noteText,
        scheduledDate
      );

      return notificationId;
    } catch (error) {
      console.error('Failed to schedule reminder:', error);
      return null;
    }
  }

  /**
   * Parse reminder time string to Date with comprehensive natural language support
   */
  parseReminderTime(timeString: string): ReminderInfo {
    const now = new Date();
    const input = timeString.toLowerCase().trim();
    let targetDate = new Date(now);
    let displayText = '';
    let isValid = true;

    // Extract time if present (e.g., "3pm", "3:30 PM", "15:00")
    const extractTime = (str: string): { hours: number; minutes: number } | null => {
      // Match patterns like "3pm", "3:30pm", "3 pm", "15:00"
      const timePatterns = [
        /(\d{1,2}):(\d{2})\s*(am|pm)/i,    // 3:30pm, 3:30 pm
        /(\d{1,2})\s*(am|pm)/i,             // 3pm, 3 pm
        /(\d{1,2}):(\d{2})/,                // 15:00, 3:30
      ];

      for (const pattern of timePatterns) {
        const match = str.match(pattern);
        if (match) {
          let hours = parseInt(match[1]);
          const minutes = match[2] ? parseInt(match[2]) : 0;
          const period = match[3]?.toLowerCase();

          if (period === 'pm' && hours < 12) hours += 12;
          if (period === 'am' && hours === 12) hours = 0;

          return { hours, minutes };
        }
      }
      return null;
    };

    // Get the extracted time or default to 9 AM
    const time = extractTime(input) || { hours: 9, minutes: 0 };

    // Day of week mapping
    const daysOfWeek: { [key: string]: number } = {
      sunday: 0, sun: 0,
      monday: 1, mon: 1,
      tuesday: 2, tue: 2, tues: 2,
      wednesday: 3, wed: 3,
      thursday: 4, thu: 4, thurs: 4,
      friday: 5, fri: 5,
      saturday: 6, sat: 6,
    };

    // Parse relative days
    if (input.includes('today')) {
      // Keep current date
      displayText = 'Today';
    } else if (input.includes('tonight')) {
      time.hours = time.hours < 18 ? 20 : time.hours; // Default to 8pm for "tonight"
      displayText = 'Tonight';
    } else if (input.includes('tomorrow')) {
      targetDate.setDate(targetDate.getDate() + 1);
      displayText = 'Tomorrow';
    } else if (input.includes('next week')) {
      targetDate.setDate(targetDate.getDate() + 7);
      displayText = 'Next week';
    } else if (input.includes('in an hour') || input.includes('in 1 hour')) {
      targetDate = new Date(now.getTime() + 60 * 60 * 1000);
      displayText = 'In 1 hour';
      // Don't override time for relative hours
      return { date: targetDate, displayText, isValid: true };
    } else if (input.includes('in 30 minutes') || input.includes('in half an hour')) {
      targetDate = new Date(now.getTime() + 30 * 60 * 1000);
      displayText = 'In 30 minutes';
      return { date: targetDate, displayText, isValid: true };
    } else if (input.match(/in (\d+) hours?/)) {
      const match = input.match(/in (\d+) hours?/);
      if (match) {
        const hours = parseInt(match[1]);
        targetDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
        displayText = `In ${hours} hour${hours > 1 ? 's' : ''}`;
        return { date: targetDate, displayText, isValid: true };
      }
    } else if (input.match(/in (\d+) minutes?/)) {
      const match = input.match(/in (\d+) minutes?/);
      if (match) {
        const minutes = parseInt(match[1]);
        targetDate = new Date(now.getTime() + minutes * 60 * 1000);
        displayText = `In ${minutes} minute${minutes > 1 ? 's' : ''}`;
        return { date: targetDate, displayText, isValid: true };
      }
    } else if (input.includes('this weekend')) {
      // Find next Saturday
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7 || 7;
      targetDate.setDate(targetDate.getDate() + daysUntilSaturday);
      displayText = 'This weekend';
    } else if (input.includes('next')) {
      // Check for "next monday", "next tuesday", etc.
      for (const [day, dayNum] of Object.entries(daysOfWeek)) {
        if (input.includes(`next ${day}`)) {
          let daysUntil = (dayNum - now.getDay() + 7) % 7;
          if (daysUntil === 0) daysUntil = 7;
          daysUntil += 7; // Add another week for "next"
          targetDate.setDate(targetDate.getDate() + daysUntil);
          displayText = `Next ${day.charAt(0).toUpperCase() + day.slice(1)}`;
          break;
        }
      }
    } else {
      // Check for day of week without "next"
      for (const [day, dayNum] of Object.entries(daysOfWeek)) {
        if (input.includes(day)) {
          let daysUntil = (dayNum - now.getDay() + 7) % 7;
          if (daysUntil === 0) daysUntil = 7; // If today, go to next week
          targetDate.setDate(targetDate.getDate() + daysUntil);
          displayText = day.charAt(0).toUpperCase() + day.slice(1);
          break;
        }
      }
    }

    // If no date pattern matched, default to tomorrow
    if (!displayText) {
      targetDate.setDate(targetDate.getDate() + 1);
      displayText = 'Tomorrow';
      isValid = false; // Mark as not a precise match
    }

    // Set the time
    targetDate.setHours(time.hours, time.minutes, 0, 0);

    // Format display text with time
    const timeStr = targetDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: time.minutes > 0 ? '2-digit' : undefined,
      hour12: true,
    });
    displayText = `${displayText} at ${timeStr}`;

    // If the time is in the past, move to the next occurrence
    if (targetDate <= now) {
      if (input.includes('today') || input.includes('tonight')) {
        // If today but time passed, move to tomorrow
        targetDate.setDate(targetDate.getDate() + 1);
        displayText = displayText.replace('Today', 'Tomorrow').replace('Tonight', 'Tomorrow');
      }
    }

    return { date: targetDate, displayText, isValid };
  }

  /**
   * Format a Date to a user-friendly display string
   */
  formatReminderDisplay(date: Date): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = date.toDateString() === tomorrow.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: date.getMinutes() > 0 ? '2-digit' : undefined,
      hour12: true,
    });

    if (isToday) {
      return `Today at ${timeStr}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${timeStr}`;
    } else {
      const dayStr = date.toLocaleDateString('en-US', { weekday: 'long' });
      return `${dayStr} at ${timeStr}`;
    }
  }

  /**
   * Cancel a scheduled notification
   */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  /**
   * Get all scheduled notifications
   */
  async getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Get badge count (number of pending notifications)
   */
  async getBadgeCount(): Promise<number> {
    try {
      const notifications = await this.getAllScheduledNotifications();
      return notifications.length;
    } catch (error) {
      console.error('Failed to get badge count:', error);
      return 0;
    }
  }

  /**
   * Set up notification listeners
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationTapped?: (response: Notifications.NotificationResponse) => void
  ) {
    // Listen for notifications received while app is foregrounded
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listen for user interactions with notifications
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification tapped:', response);
        onNotificationTapped?.(response);
      }
    );

    return {
      receivedSubscription,
      responseSubscription,
      remove: () => {
        receivedSubscription.remove();
        responseSubscription.remove();
      },
    };
  }
}

export default new NotificationService();
