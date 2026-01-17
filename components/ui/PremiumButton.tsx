/**
 * PremiumButton - Beautiful button component with spring animations
 *
 * Features:
 * - Spring-based press animation
 * - Multiple variants (primary, secondary, ghost, danger)
 * - Multiple sizes (sm, md, lg)
 * - Loading state with smooth transition
 * - Haptic feedback
 * - Optional icon support
 */

import React, { ReactNode } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, shadows, animation } from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface PremiumButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  // Use gradient background (only for primary variant)
  gradient?: boolean;
}

const sizeStyles = {
  sm: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    fontSize: typography.fontSize.sm,
    iconSize: 16,
    gap: spacing[1],
    minHeight: 36,
    borderRadius: borderRadius.md,
  },
  md: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
    fontSize: typography.fontSize.base,
    iconSize: 20,
    gap: spacing[2],
    minHeight: 48,
    borderRadius: borderRadius.lg,
  },
  lg: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    fontSize: typography.fontSize.md,
    iconSize: 24,
    gap: spacing[2],
    minHeight: 56,
    borderRadius: borderRadius.xl,
  },
};

const variantStyles = {
  primary: {
    background: colors.primary[500],
    backgroundPressed: colors.primary[600],
    text: colors.neutral[0],
    border: 'transparent',
    shadow: shadows.primary,
  },
  secondary: {
    background: colors.neutral[0],
    backgroundPressed: colors.neutral[100],
    text: colors.primary[600],
    border: colors.primary[200],
    shadow: shadows.md,
  },
  ghost: {
    background: 'transparent',
    backgroundPressed: colors.primary[50],
    text: colors.primary[600],
    border: 'transparent',
    shadow: shadows.none,
  },
  danger: {
    background: colors.semantic.error,
    backgroundPressed: '#dc2626',
    text: colors.neutral[0],
    border: 'transparent',
    shadow: shadows.md,
  },
};

export function PremiumButton({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  gradient = false,
}: PremiumButtonProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const sizeConfig = sizeStyles[size];
  const variantConfig = variantStyles[variant];

  const triggerHaptic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const gesture = Gesture.Tap()
    .enabled(!disabled && !loading)
    .onBegin(() => {
      'worklet';
      scale.value = withSpring(0.97, animation.spring.snappy);
      pressed.value = withTiming(1, { duration: animation.duration.fast });
    })
    .onFinalize((_, success) => {
      'worklet';
      scale.value = withSpring(1, animation.spring.snappy);
      pressed.value = withTiming(0, { duration: animation.duration.fast });
      if (success && onPress) {
        runOnJS(triggerHaptic)();
        runOnJS(onPress)();
      }
    });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    if (variant === 'primary' && gradient) return {};

    return {
      backgroundColor: interpolateColor(
        pressed.value,
        [0, 1],
        [variantConfig.background, variantConfig.backgroundPressed]
      ),
    };
  });

  const content = (
    <View style={[styles.content, { gap: sizeConfig.gap }]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantConfig.text}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconContainer}>{icon}</View>
          )}
          <Text
            style={[
              styles.text,
              {
                fontSize: sizeConfig.fontSize,
                color: variantConfig.text,
              },
            ]}
          >
            {children}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconContainer}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  const buttonStyles = [
    styles.button,
    {
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      minHeight: sizeConfig.minHeight,
      borderRadius: sizeConfig.borderRadius,
      borderWidth: variantConfig.border !== 'transparent' ? 1.5 : 0,
      borderColor: variantConfig.border,
    },
    variantConfig.shadow,
    fullWidth && styles.fullWidth,
  ];

  if (variant === 'primary' && gradient && !disabled) {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[animatedContainerStyle, fullWidth && styles.fullWidth]}>
          <LinearGradient
            colors={colors.gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[buttonStyles, { overflow: 'hidden' }]}
          >
            {content}
          </LinearGradient>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          buttonStyles,
          animatedContainerStyle,
          animatedBackgroundStyle,
        ]}
      >
        {content}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: typography.fontWeight.semibold,
    letterSpacing: typography.letterSpacing.wide,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PremiumButton;
