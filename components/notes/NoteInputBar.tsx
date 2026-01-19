/**
 * NoteInputBar - WhatsApp-style input bar with text input and hold-to-record mic
 *
 * Features:
 * - Text input on the left, mic button on the right
 * - Hold microphone to record (like WhatsApp)
 * - Slide left to cancel recording
 * - Send button appears when text is entered
 * - Positioned above tabs, not overlapping
 * - Dark mode support
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Platform,
  Keyboard,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius, shadows, layout, animation, getThemedColors } from '../../theme';

interface NoteInputBarProps {
  onSendText: (text: string) => void;
  onRecordingStart: () => void;
  onRecordingEnd: () => void;
  onRecordingCancel: () => void;
  isRecording: boolean;
  recordingDuration: number;
  themedColors: ReturnType<typeof getThemedColors>;
  disabled?: boolean;
  /** When true, recording was started programmatically (e.g., Re-record) and needs tap-to-stop */
  externalRecordingStart?: boolean;
}

export function NoteInputBar({
  onSendText,
  onRecordingStart,
  onRecordingEnd,
  onRecordingCancel,
  isRecording,
  recordingDuration,
  themedColors,
  disabled = false,
  externalRecordingStart = false,
}: NoteInputBarProps) {
  const [text, setText] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [slideX, setSlideX] = useState(0);
  const [isSlidingToCancel, setIsSlidingToCancel] = useState(false);

  // Track if we're currently in a recording gesture
  const isRecordingGestureRef = useRef(false);
  const isSlidingToCancelRef = useRef(false);
  const cancelThreshold = -100; // Pixels to slide left to cancel

  // Animation values
  const micScale = useSharedValue(1);
  const micColorProgress = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);
  const sendButtonScale = useSharedValue(0);

  // Track starting X position for slide gesture
  const startTouchXRef = useRef(0);

  // Touch handlers for hold-to-record and slide-to-cancel
  const handleTouchStart = (evt: GestureResponderEvent) => {
    const touch = evt.nativeEvent;
    startTouchXRef.current = touch.pageX;

    // If already recording (external mode), just track start position for slide
    if (isRecording && externalRecordingStart) {
      isRecordingGestureRef.current = true;
      isSlidingToCancelRef.current = false;
      return;
    }

    // Start new recording if text is empty, not disabled, not in external mode, and not already recording
    if (!disabled && text.trim().length === 0 && !externalRecordingStart && !isRecording) {
      isRecordingGestureRef.current = true;
      isSlidingToCancelRef.current = false;
      micScale.value = withSpring(1.2, animation.spring.snappy);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onRecordingStart();
    }
  };

  const handleTouchMove = (evt: GestureResponderEvent) => {
    if (!isRecording) return;

    const touch = evt.nativeEvent;
    const dx = touch.pageX - startTouchXRef.current;
    const newSlideX = Math.min(0, dx); // Only allow sliding left
    setSlideX(newSlideX);

    // Check if crossed cancel threshold
    if (newSlideX < cancelThreshold) {
      if (!isSlidingToCancelRef.current) {
        isSlidingToCancelRef.current = true;
        setIsSlidingToCancel(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      if (isSlidingToCancelRef.current) {
        isSlidingToCancelRef.current = false;
        setIsSlidingToCancel(false);
      }
    }
  };

  const handleTouchEnd = (evt: GestureResponderEvent) => {
    if (!isRecording) return;

    micScale.value = withSpring(1, animation.spring.snappy);

    const touch = evt.nativeEvent;
    const dx = touch.pageX - startTouchXRef.current;
    const shouldCancel = isSlidingToCancelRef.current || dx < cancelThreshold;

    if (shouldCancel) {
      // Cancel recording
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onRecordingCancel();
    } else {
      // End recording and process
      onRecordingEnd();
    }

    setSlideX(0);
    setIsSlidingToCancel(false);
    isSlidingToCancelRef.current = false;
    isRecordingGestureRef.current = false;
  };

  // Keyboard listeners
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Show/hide send button based on text
  useEffect(() => {
    if (text.trim().length > 0) {
      sendButtonScale.value = withSpring(1, animation.spring.snappy);
    } else {
      sendButtonScale.value = withSpring(0, animation.spring.snappy);
    }
  }, [text]);

  // Recording animation
  useEffect(() => {
    if (isRecording) {
      micColorProgress.value = withTiming(1, { duration: 200 });
      if (!isRecordingGestureRef.current) {
        // Only animate scale if not from gesture (gesture handles its own scale)
        micScale.value = withSpring(1.1, animation.spring.snappy);
      }

      // Pulsing effect
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(0.2, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      micColorProgress.value = withTiming(0, { duration: 200 });
      micScale.value = withSpring(1, animation.spring.snappy);
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
      setSlideX(0);
      setIsSlidingToCancel(false);
    }
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendText = () => {
    if (text.trim().length > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSendText(text.trim());
      setText('');
      Keyboard.dismiss();
    }
  };

  // Handle tap on mic button for external recording mode (tap-to-stop)
  const handleExternalRecordingStop = () => {
    if (isRecording && externalRecordingStart) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onRecordingEnd();
    }
  };

  // Animated styles
  const animatedMicStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
    backgroundColor: interpolateColor(
      micColorProgress.value,
      [0, 1],
      [colors.primary[500], colors.semantic.error]
    ),
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
    backgroundColor: colors.semantic.error,
  }));

  const animatedSendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
    opacity: sendButtonScale.value,
  }));

  const showSendButton = text.trim().length > 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themedColors.background.primary,
          borderTopColor: themedColors.surface.border,
          marginBottom: keyboardHeight > 0 ? keyboardHeight - layout.tabBarHeight : 0,
        },
      ]}
    >
      {isRecording ? (
        // Recording mode - show recording indicator with slide hint
        <View style={[styles.recordingContainer, { transform: [{ translateX: slideX }] }]}>
          <View style={styles.recordingIndicator}>
            <View style={[styles.recordingDot, isSlidingToCancel && styles.recordingDotCancel]} />
            <Animated.Text style={[styles.recordingTime, { color: themedColors.text.primary }]}>
              {formatDuration(recordingDuration)}
            </Animated.Text>
          </View>

          <View style={styles.slideHint}>
            <Ionicons
              name="chevron-back"
              size={16}
              color={isSlidingToCancel ? colors.semantic.error : themedColors.text.tertiary}
            />
            <Animated.Text
              style={[
                styles.slideHintText,
                { color: isSlidingToCancel ? colors.semantic.error : themedColors.text.tertiary }
              ]}
            >
              {isSlidingToCancel ? 'Release to cancel' : 'Slide to cancel'}
            </Animated.Text>
            {externalRecordingStart && !isSlidingToCancel && (
              <>
                <Animated.Text style={[styles.slideHintDivider, { color: themedColors.text.tertiary }]}>
                  •
                </Animated.Text>
                <Animated.Text style={[styles.slideHintText, { color: themedColors.text.tertiary }]}>
                  Tap to finish
                </Animated.Text>
              </>
            )}
          </View>
        </View>
      ) : (
        // Text input mode
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: themedColors.input.background,
              borderColor: themedColors.input.border,
            },
          ]}
        >
          <TextInput
            style={[styles.textInput, { color: themedColors.text.primary }]}
            placeholder="Type a note..."
            placeholderTextColor={themedColors.input.placeholder}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            editable={!disabled}
          />
        </View>
      )}

      {/* Action button (Send or Mic) */}
      <View style={styles.actionButtonContainer}>
        {showSendButton && !isRecording ? (
          // Send button
          <Animated.View style={animatedSendStyle}>
            <View
              style={[styles.actionButton, { backgroundColor: colors.primary[500] }]}
              onTouchEnd={handleSendText}
            >
              <Ionicons name="send" size={20} color={colors.neutral[0]} />
            </View>
          </Animated.View>
        ) : isRecording ? (
          // Recording in progress - supports both tap-to-stop AND slide-to-cancel
          <View
            style={styles.micWrapper}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Pulse ring */}
            <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />

            {/* Stop button */}
            <Animated.View style={[styles.actionButton, animatedMicStyle]}>
              <Ionicons
                name="stop"
                size={22}
                color={colors.neutral[0]}
              />
            </Animated.View>
          </View>
        ) : (
          // Mic button with touch handlers for hold-to-record and slide-to-cancel
          <View
            style={styles.micWrapper}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Pulse ring */}
            <Animated.View style={[styles.pulseRing, animatedPulseStyle]} />

            {/* Mic button */}
            <Animated.View style={[styles.actionButton, animatedMicStyle]}>
              <Ionicons
                name={isRecording ? 'stop' : 'mic-outline'}
                size={22}
                color={colors.neutral[0]}
              />
            </Animated.View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    paddingBottom: spacing[3],
    borderTopWidth: 1,
    gap: spacing[2],
    position: 'relative',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    minHeight: 44,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.4,
    paddingTop: Platform.OS === 'ios' ? spacing[1] : 0,
    paddingBottom: Platform.OS === 'ios' ? spacing[1] : 0,
  },
  actionButtonContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micWrapper: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  actionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    height: 44,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.semantic.error,
  },
  recordingDotCancel: {
    backgroundColor: colors.neutral[400],
  },
  recordingTime: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  slideHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  slideHintText: {
    fontSize: typography.fontSize.sm,
  },
  slideHintDivider: {
    fontSize: typography.fontSize.sm,
    marginHorizontal: spacing[1],
  },
});

export default NoteInputBar;
