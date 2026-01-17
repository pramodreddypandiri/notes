/**
 * SoundService - Premium audio feedback for micro-interactions
 *
 * Features:
 * - Subtle confirmation sounds
 * - Recording start/stop sounds
 * - Success chimes
 * - Error feedback
 * - Toggleable in settings
 */

import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sound settings key
const SOUND_ENABLED_KEY = 'sound_enabled';

// Sound URLs (using system sounds or small embedded audio)
// In production, you'd bundle these as assets or use expo-asset
const SOUNDS = {
  // Confirmation sounds
  tap: null as Audio.Sound | null,
  success: null as Audio.Sound | null,
  error: null as Audio.Sound | null,

  // Recording sounds
  recordStart: null as Audio.Sound | null,
  recordStop: null as Audio.Sound | null,

  // Navigation sounds
  pageTransition: null as Audio.Sound | null,

  // Completion sounds
  planReady: null as Audio.Sound | null,
  taskComplete: null as Audio.Sound | null,
};

class SoundService {
  private isEnabled: boolean = true;
  private isInitialized: boolean = false;

  /**
   * Initialize the sound service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved preference
      const saved = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      this.isEnabled = saved !== 'false';

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: false, // Respect silent mode
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize sound service:', error);
    }
  }

  /**
   * Enable or disable sounds
   */
  async setEnabled(enabled: boolean): Promise<void> {
    this.isEnabled = enabled;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
  }

  /**
   * Check if sounds are enabled
   */
  getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Play a success chime (e.g., when plan is ready)
   */
  async playSuccess(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // For now, we'll use haptics as a placeholder
      // In production, load an actual sound file:
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../assets/sounds/success.mp3')
      // );
      // await sound.playAsync();

      // Placeholder: simulate with a short delay
      // This would be replaced with actual sound playback
      console.log('[Sound] Playing success chime');
    } catch (error) {
      console.error('Failed to play success sound:', error);
    }
  }

  /**
   * Play recording start sound
   */
  async playRecordStart(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('[Sound] Playing record start');
      // Placeholder for actual sound
    } catch (error) {
      console.error('Failed to play record start sound:', error);
    }
  }

  /**
   * Play recording stop sound
   */
  async playRecordStop(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('[Sound] Playing record stop');
      // Placeholder for actual sound
    } catch (error) {
      console.error('Failed to play record stop sound:', error);
    }
  }

  /**
   * Play plan ready chime
   */
  async playPlanReady(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('[Sound] Playing plan ready chime');
      // This would be a gentle, satisfying chime
      // In production:
      // const { sound } = await Audio.Sound.createAsync(
      //   require('../assets/sounds/plan-ready.mp3')
      // );
      // await sound.setVolumeAsync(0.5);
      // await sound.playAsync();
    } catch (error) {
      console.error('Failed to play plan ready sound:', error);
    }
  }

  /**
   * Play task complete sound
   */
  async playTaskComplete(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('[Sound] Playing task complete');
      // Satisfying completion sound
    } catch (error) {
      console.error('Failed to play task complete sound:', error);
    }
  }

  /**
   * Play error sound
   */
  async playError(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      console.log('[Sound] Playing error sound');
      // Subtle error indication
    } catch (error) {
      console.error('Failed to play error sound:', error);
    }
  }

  /**
   * Play subtle tap feedback
   */
  async playTap(): Promise<void> {
    if (!this.isEnabled) return;

    try {
      // Very subtle click/tap sound
      console.log('[Sound] Playing tap');
    } catch (error) {
      console.error('Failed to play tap sound:', error);
    }
  }

  /**
   * Clean up loaded sounds
   */
  async cleanup(): Promise<void> {
    try {
      for (const key of Object.keys(SOUNDS)) {
        const sound = SOUNDS[key as keyof typeof SOUNDS];
        if (sound) {
          await sound.unloadAsync();
          SOUNDS[key as keyof typeof SOUNDS] = null;
        }
      }
    } catch (error) {
      console.error('Failed to cleanup sounds:', error);
    }
  }
}

// Export singleton
export const soundService = new SoundService();
export default soundService;
