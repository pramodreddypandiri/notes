import { Audio } from 'expo-av';
import { Platform } from 'react-native';

class VoiceService {
  private recording: Audio.Recording | null = null;
  private isRecording: boolean = false;

  /**
   * Request microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Check if microphone permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  }

  /**
   * Start recording audio
   */
  async startRecording(): Promise<void> {
    try {
      // Check permissions first
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Microphone permission not granted');
        }
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;

      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return the audio file URI
   */
  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        console.warn('No recording in progress');
        return null;
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      this.isRecording = false;
      this.recording = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      console.log('Recording stopped, file saved at:', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      throw error;
    }
  }

  /**
   * Cancel recording without saving
   */
  async cancelRecording(): Promise<void> {
    try {
      if (!this.recording) {
        return;
      }

      await this.recording.stopAndUnloadAsync();
      this.isRecording = false;
      this.recording = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      console.log('Recording cancelled');
    } catch (error) {
      console.error('Failed to cancel recording:', error);
      throw error;
    }
  }

  /**
   * Get current recording status
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration in milliseconds
   */
  async getRecordingDuration(): Promise<number> {
    if (!this.recording) {
      return 0;
    }

    try {
      const status = await this.recording.getStatusAsync();
      return status.durationMillis || 0;
    } catch (error) {
      console.error('Failed to get recording duration:', error);
      return 0;
    }
  }

  /**
   * Convert audio file to text using a speech-to-text service
   * This is a placeholder - implement with your preferred service (OpenAI Whisper, Google, etc.)
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      // TODO: Implement actual transcription
      // Options:
      // 1. OpenAI Whisper API
      // 2. Google Cloud Speech-to-Text
      // 3. Azure Speech Services
      // 4. AWS Transcribe

      console.log('Transcribing audio from:', audioUri);
      
      // Placeholder return
      throw new Error('Transcription service not implemented yet');
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      throw error;
    }
  }
}

export default new VoiceService();