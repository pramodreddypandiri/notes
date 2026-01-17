/**
 * VoiceRecordButton - Premium voice recording button with animations
 *
 * Features:
 * - Pulsing animation while recording
 * - Smooth state transitions
 * - Circular waveform effect
 * - Recording duration timer
 * - Haptic feedback
 * - Processing state with spinner
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CircularWaveform } from './VoiceWaveform';
import { colors, typography, spacing, shadows, animation } from '../../theme';

interface VoiceRecordButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
}

export function VoiceRecordButton({
  isRecording,
  isProcessing,
  onPress,
  disabled = false,
  size = 72,
}: VoiceRecordButtonProps) {
  const [duration, setDuration] = useState(0);

  // Animation values
  const scale = useSharedValue(1);
  const innerScale = useSharedValue(1);
  const colorProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const processingRotation = useSharedValue(0);

  // Duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      setDuration(0);
      interval = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Recording animation
  useEffect(() => {
    if (isRecording) {
      // Color transition to red
      colorProgress.value = withTiming(1, { duration: 300 });

      // Pulsing effect
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 800 }),
          withTiming(0.1, { duration: 800 })
        ),
        -1,
        true
      );

      // Inner scale breathing
      innerScale.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
    } else {
      colorProgress.value = withTiming(0, { duration: 300 });
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
      innerScale.value = withSpring(1, animation.spring.default);
    }
  }, [isRecording]);

  // Processing animation
  useEffect(() => {
    if (isProcessing) {
      processingRotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      processingRotation.value = withTiming(0, { duration: 200 });
    }
  }, [isProcessing]);

  const triggerHaptic = () => {
    if (isRecording) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const gesture = Gesture.Tap()
    .enabled(!disabled && !isProcessing)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.92, animation.spring.snappy);
    })
    .onFinalize((_, success) => {
      'worklet';
      scale.value = withSpring(1, animation.spring.snappy);
      if (success) {
        runOnJS(triggerHaptic)();
        runOnJS(onPress)();
      }
    });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  const animatedButtonStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [colors.primary[500], colors.semantic.error]
    ),
    transform: [{ scale: innerScale.value }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
    backgroundColor: interpolateColor(
      colorProgress.value,
      [0, 1],
      [colors.primary[500], colors.semantic.error]
    ),
  }));

  const animatedProcessingStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${processingRotation.value}deg` }],
  }));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.wrapper}>
      {/* Circular waveform effect */}
      {isRecording && <CircularWaveform isRecording={isRecording} size={size} color={colors.semantic.error} />}

      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.container, animatedContainerStyle]}>
          {/* Pulse ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              { width: size + 24, height: size + 24, borderRadius: (size + 24) / 2 },
              animatedPulseStyle,
            ]}
          />

          {/* Main button */}
          <Animated.View
            style={[
              styles.button,
              { width: size, height: size, borderRadius: size / 2 },
              shadows.primary,
              animatedButtonStyle,
            ]}
          >
            {isProcessing ? (
              <Animated.View style={animatedProcessingStyle}>
                <Ionicons name="sync" size={size * 0.4} color={colors.neutral[0]} />
              </Animated.View>
            ) : (
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={size * 0.4}
                color={colors.neutral[0]}
              />
            )}
          </Animated.View>
        </Animated.View>
      </GestureDetector>

      {/* Duration display */}
      {isRecording && (
        <View style={styles.durationContainer}>
          <View style={styles.recordingIndicator} />
          <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        </View>
      )}

      {/* Hint text */}
      <Text style={styles.hintText}>
        {isProcessing
          ? 'Processing...'
          : isRecording
          ? 'Tap to stop'
          : 'Tap to record'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    gap: spacing[2],
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.error,
  },
  durationText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[700],
    fontVariant: ['tabular-nums'],
  },
  hintText: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
});

export default VoiceRecordButton;
