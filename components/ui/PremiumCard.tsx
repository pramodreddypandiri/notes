/**
 * PremiumCard - Elevated card component with refined shadows
 *
 * Features:
 * - Multiple elevation levels
 * - Optional press animation
 * - Swipe-to-delete support
 * - Customizable border radius and padding
 */

import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows, animation } from '../../theme';

type ElevationLevel = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface PremiumCardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: ElevationLevel;
  padding?: keyof typeof spacing;
  radius?: keyof typeof borderRadius;
  onPress?: () => void;
  onDelete?: () => void;
  // Animation props
  enterAnimation?: boolean;
  exitAnimation?: boolean;
  // Border
  borderColor?: string;
}

const SWIPE_THRESHOLD = 100;
const DELETE_THRESHOLD = 150;

export function PremiumCard({
  children,
  style,
  elevation = 'md',
  padding = 4,
  radius = 'lg',
  onPress,
  onDelete,
  enterAnimation = true,
  exitAnimation = true,
  borderColor,
}: PremiumCardProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const triggerDeleteHaptic = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  // Tap gesture for pressable cards
  const tapGesture = Gesture.Tap()
    .enabled(!!onPress)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.98, animation.spring.snappy);
    })
    .onFinalize((_, success) => {
      'worklet';
      scale.value = withSpring(1, animation.spring.snappy);
      if (success && onPress) {
        runOnJS(triggerHaptic)();
        runOnJS(onPress)();
      }
    });

  // Pan gesture for swipe to delete
  const panGesture = Gesture.Pan()
    .enabled(!!onDelete)
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      'worklet';
      // Only allow swiping left
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -DELETE_THRESHOLD);
        deleteOpacity.value = Math.min(Math.abs(event.translationX) / SWIPE_THRESHOLD, 1);
      }
    })
    .onEnd((event) => {
      'worklet';
      if (event.translationX < -SWIPE_THRESHOLD && onDelete) {
        // Trigger delete
        translateX.value = withTiming(-400, { duration: animation.duration.normal });
        runOnJS(triggerDeleteHaptic)();
        runOnJS(onDelete)();
      } else {
        // Snap back
        translateX.value = withSpring(0, animation.spring.default);
        deleteOpacity.value = withTiming(0, { duration: animation.duration.fast });
      }
    });

  const composedGesture = Gesture.Race(
    tapGesture,
    panGesture
  );

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
    transform: [{ scale: 0.8 + deleteOpacity.value * 0.2 }],
  }));

  const shadowStyle = shadows[elevation] || shadows.none;

  const enteringAnim = enterAnimation ? FadeIn.duration(animation.duration.normal).springify() : undefined;
  const exitingAnim = exitAnimation ? FadeOut.duration(animation.duration.fast) : undefined;

  return (
    <View style={styles.container}>
      {/* Delete indicator */}
      {onDelete && (
        <Animated.View style={[styles.deleteIndicator, animatedDeleteStyle]}>
          <Ionicons name="trash" size={24} color={colors.neutral[0]} />
        </Animated.View>
      )}

      <GestureDetector gesture={composedGesture}>
        <Animated.View
          entering={enteringAnim}
          exiting={exitingAnim}
          layout={Layout.springify()}
          style={[
            styles.card,
            {
              padding: spacing[padding],
              borderRadius: borderRadius[radius],
              borderColor: borderColor || 'transparent',
              borderWidth: borderColor ? 1 : 0,
            },
            shadowStyle,
            animatedCardStyle,
            style,
          ]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  card: {
    backgroundColor: colors.neutral[0],
    overflow: 'hidden',
  },
  deleteIndicator: {
    position: 'absolute',
    right: spacing[4],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.lg,
  },
});

export default PremiumCard;
