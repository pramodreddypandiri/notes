/**
 * AnimatedPressable - Premium pressable component with spring animations
 *
 * Features:
 * - Spring-based scale animation on press
 * - Haptic feedback support
 * - Customizable animation intensity
 */

import React, { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { animation } from '../../theme';

interface AnimatedPressableProps {
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  // Scale intensity: 'subtle' (0.98), 'normal' (0.95), 'strong' (0.9)
  scaleIntensity?: 'subtle' | 'normal' | 'strong';
  // Haptic feedback type
  hapticType?: 'light' | 'medium' | 'heavy' | 'none';
  // Animation spring preset
  springPreset?: keyof typeof animation.spring;
  // Long press delay in ms
  longPressDelay?: number;
}

const scaleValues = {
  subtle: 0.98,
  normal: 0.95,
  strong: 0.9,
};

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
  scaleIntensity = 'normal',
  hapticType = 'light',
  springPreset = 'snappy',
  longPressDelay = 500,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);
  const isPressed = useSharedValue(false);

  const triggerHaptic = () => {
    'worklet';
    if (hapticType === 'none') return;

    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };

    runOnJS(Haptics.impactAsync)(hapticMap[hapticType]);
  };

  const springConfig = animation.spring[springPreset];

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      'worklet';
      isPressed.value = true;
      scale.value = withSpring(scaleValues[scaleIntensity], springConfig);
    })
    .onFinalize((_, success) => {
      'worklet';
      isPressed.value = false;
      scale.value = withSpring(1, springConfig);
      if (success && onPress) {
        triggerHaptic();
        runOnJS(onPress)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(longPressDelay)
    .onStart(() => {
      'worklet';
      if (onLongPress) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
        runOnJS(onLongPress)();
      }
    })
    .onFinalize(() => {
      'worklet';
      scale.value = withSpring(1, springConfig);
    });

  const composedGesture = Gesture.Race(gesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

export default AnimatedPressable;
