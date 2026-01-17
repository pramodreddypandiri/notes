/**
 * VoiceCaptureSheet - Full-screen voice capture experience
 *
 * Features:
 * - Immersive recording interface
 * - Real-time waveform visualization
 * - Smooth open/close animations
 * - Processing state with progress indication
 * - Success celebration animation
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  interpolate,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { VoiceWaveform } from './VoiceWaveform';
import { VoiceRecordButton } from './VoiceRecordButton';
import AnimatedPressable from '../ui/AnimatedPressable';
import { colors, typography, spacing, borderRadius, animation } from '../../theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface VoiceCaptureSheetProps {
  visible: boolean;
  onClose: () => void;
  onCaptureComplete: (audioUri: string) => void;
  isRecording: boolean;
  isProcessing: boolean;
  onToggleRecording: () => void;
}

type CaptureState = 'idle' | 'recording' | 'processing' | 'success';

export function VoiceCaptureSheet({
  visible,
  onClose,
  onCaptureComplete,
  isRecording,
  isProcessing,
  onToggleRecording,
}: VoiceCaptureSheetProps) {
  const [captureState, setCaptureState] = useState<CaptureState>('idle');
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const successScale = useSharedValue(0);
  const checkmarkProgress = useSharedValue(0);

  // Derived state
  useEffect(() => {
    if (isProcessing) {
      setCaptureState('processing');
    } else if (isRecording) {
      setCaptureState('recording');
    } else {
      setCaptureState('idle');
    }
  }, [isRecording, isProcessing]);

  // Open/close animations
  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, animation.spring.default);
      backdropOpacity.value = withTiming(1, { duration: animation.duration.normal });
    } else {
      translateY.value = withSpring(SCREEN_HEIGHT, animation.spring.default);
      backdropOpacity.value = withTiming(0, { duration: animation.duration.fast });
    }
  }, [visible]);

  // Success animation
  const showSuccess = () => {
    setCaptureState('success');
    successScale.value = withSequence(
      withSpring(1.2, animation.spring.bouncy),
      withSpring(1, animation.spring.default)
    );
    checkmarkProgress.value = withTiming(1, { duration: 400 });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-close after success
    setTimeout(() => {
      onClose();
      setCaptureState('idle');
      successScale.value = 0;
      checkmarkProgress.value = 0;
    }, 1500);
  };

  const handleClose = () => {
    if (isRecording) {
      // Cancel recording
      onToggleRecording();
    }
    onClose();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      'worklet';
      if (event.translationY > 0) {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationY > 150 || event.velocityY > 500) {
        translateY.value = withSpring(SCREEN_HEIGHT, animation.spring.default);
        backdropOpacity.value = withTiming(0, { duration: animation.duration.fast });
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, animation.spring.default);
      }
    });

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
    pointerEvents: backdropOpacity.value > 0 ? 'auto' : 'none',
  }));

  const animatedSuccessStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successScale.value,
  }));

  if (!visible && translateY.value >= SCREEN_HEIGHT - 10) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[styles.backdrop, animatedBackdropStyle]}
        onTouchEnd={handleClose}
      />

      {/* Sheet */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.sheet, animatedSheetStyle]}>
          <LinearGradient
            colors={[colors.neutral[0], colors.neutral[50]]}
            style={styles.gradient}
          >
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            {/* Close button */}
            <AnimatedPressable
              onPress={handleClose}
              style={styles.closeButton}
              hapticType="light"
            >
              <Ionicons name="close" size={28} color={colors.neutral[500]} />
            </AnimatedPressable>

            {/* Content */}
            <View style={styles.content}>
              {captureState === 'success' ? (
                // Success state
                <Animated.View style={[styles.successContainer, animatedSuccessStyle]}>
                  <View style={styles.successCircle}>
                    <Ionicons name="checkmark" size={48} color={colors.neutral[0]} />
                  </View>
                  <Text style={styles.successText}>Note captured!</Text>
                </Animated.View>
              ) : (
                <>
                  {/* Title */}
                  <Text style={styles.title}>
                    {captureState === 'recording'
                      ? 'Listening...'
                      : captureState === 'processing'
                      ? 'Processing...'
                      : 'Capture a note'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {captureState === 'recording'
                      ? 'Speak naturally, I\'m listening'
                      : captureState === 'processing'
                      ? 'Turning your voice into a note'
                      : 'Tap the mic and tell me what\'s on your mind'}
                  </Text>

                  {/* Waveform */}
                  <View style={styles.waveformContainer}>
                    <VoiceWaveform
                      isRecording={isRecording}
                      isProcessing={isProcessing}
                      barCount={32}
                      maxHeight={60}
                      color={isRecording ? colors.semantic.error : colors.primary[400]}
                    />
                  </View>

                  {/* Record button */}
                  <View style={styles.buttonContainer}>
                    <VoiceRecordButton
                      isRecording={isRecording}
                      isProcessing={isProcessing}
                      onPress={onToggleRecording}
                      size={80}
                    />
                  </View>

                  {/* Tips */}
                  {captureState === 'idle' && (
                    <Animated.View
                      entering={FadeIn.delay(300).duration(400)}
                      style={styles.tipsContainer}
                    >
                      <Text style={styles.tipsTitle}>Try saying:</Text>
                      <View style={styles.tipsList}>
                        <TipItem text="Remind me to call mom tomorrow at 3pm" />
                        <TipItem text="I want to try that new Thai place" />
                        <TipItem text="Book bowling for Saturday evening" />
                      </View>
                    </Animated.View>
                  )}
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function TipItem({ text }: { text: string }) {
  return (
    <View style={styles.tipItem}>
      <View style={styles.tipBullet} />
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background.overlayDark,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.neutral[300],
    borderRadius: borderRadius.full,
  },
  closeButton: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginTop: spacing[2],
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  waveformContainer: {
    marginTop: spacing[10],
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: spacing[10],
    alignItems: 'center',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent.emerald.base,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginTop: spacing[4],
  },
  tipsContainer: {
    marginTop: spacing[12],
    paddingHorizontal: spacing[4],
  },
  tipsTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[500],
    marginBottom: spacing[3],
  },
  tipsList: {
    gap: spacing[2],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.md,
  },
  tipBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary[400],
    marginRight: spacing[3],
  },
  tipText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[600],
    flex: 1,
  },
});

export default VoiceCaptureSheet;
