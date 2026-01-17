/**
 * PlanGenerationLoader - The "magic moment" when plans are being generated
 *
 * Features:
 * - Engaging multi-stage loading animation
 * - Progress indication with stage descriptions
 * - Particle/sparkle effects
 * - Smooth state transitions
 * - Builds anticipation for the reveal
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, typography, spacing, borderRadius, animation } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlanGenerationLoaderProps {
  isLoading: boolean;
  onComplete?: () => void;
}

const STAGES = [
  { icon: 'journal-outline', text: 'Reading your notes...', duration: 1500 },
  { icon: 'location-outline', text: 'Finding places nearby...', duration: 2000 },
  { icon: 'sparkles', text: 'Crafting your perfect weekend...', duration: 2500 },
  { icon: 'calendar-outline', text: 'Finalizing plans...', duration: 1000 },
];

export function PlanGenerationLoader({ isLoading, onComplete }: PlanGenerationLoaderProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [showContent, setShowContent] = useState(false);

  // Animation values
  const orbitRotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  // Particle positions
  const particles = Array.from({ length: 8 }, (_, i) => ({
    x: useSharedValue(0),
    y: useSharedValue(0),
    opacity: useSharedValue(0),
    scale: useSharedValue(0),
  }));

  useEffect(() => {
    if (isLoading) {
      setShowContent(true);
      setCurrentStage(0);

      // Orbit rotation
      orbitRotation.value = withRepeat(
        withTiming(360, { duration: 8000, easing: Easing.linear }),
        -1,
        false
      );

      // Pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Glow animation
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500 }),
          withTiming(0.3, { duration: 1500 })
        ),
        -1,
        true
      );

      // Icon entrance
      iconScale.value = withSpring(1, animation.spring.bouncy);

      // Particle animations
      particles.forEach((particle, i) => {
        const angle = (i / particles.length) * Math.PI * 2;
        const delay = i * 200;

        particle.x.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(Math.cos(angle) * 60, { duration: 2000, easing: Easing.out(Easing.ease) }),
              withTiming(0, { duration: 0 })
            ),
            -1,
            false
          )
        );

        particle.y.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(Math.sin(angle) * 60 - 30, { duration: 2000, easing: Easing.out(Easing.ease) }),
              withTiming(0, { duration: 0 })
            ),
            -1,
            false
          )
        );

        particle.opacity.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 500 }),
              withTiming(0, { duration: 1500 })
            ),
            -1,
            false
          )
        );

        particle.scale.value = withDelay(
          delay,
          withRepeat(
            withSequence(
              withTiming(1, { duration: 300 }),
              withTiming(0.5, { duration: 1700 })
            ),
            -1,
            false
          )
        );
      });

      // Stage progression
      let totalDuration = 0;
      STAGES.forEach((stage, index) => {
        setTimeout(() => {
          if (isLoading) {
            setCurrentStage(index);
            progressWidth.value = withTiming(((index + 1) / STAGES.length) * 100, {
              duration: stage.duration * 0.8,
            });
          }
        }, totalDuration);
        totalDuration += stage.duration;
      });

      // Complete callback
      setTimeout(() => {
        if (onComplete) onComplete();
      }, totalDuration);
    } else {
      // Reset
      iconScale.value = withTiming(0, { duration: 200 });
      setTimeout(() => setShowContent(false), 300);
    }
  }, [isLoading]);

  const animatedOrbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRotation.value}deg` }],
  }));

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  if (!showContent) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
    >
      {/* Background glow */}
      <Animated.View style={[styles.glow, animatedGlowStyle]}>
        <LinearGradient
          colors={[colors.primary[400], colors.accent.violet.base]}
          style={styles.glowGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      {/* Orbiting ring */}
      <Animated.View style={[styles.orbitContainer, animatedOrbitStyle]}>
        <View style={styles.orbitRing}>
          <View style={styles.orbitDot} />
          <View style={[styles.orbitDot, styles.orbitDotOpposite]} />
        </View>
      </Animated.View>

      {/* Central icon */}
      <Animated.View style={[styles.iconContainer, animatedPulseStyle]}>
        <Animated.View style={animatedIconStyle}>
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.iconBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={STAGES[currentStage].icon as any}
              size={40}
              color={colors.neutral[0]}
            />
          </LinearGradient>
        </Animated.View>
      </Animated.View>

      {/* Particles */}
      {particles.map((particle, i) => (
        <ParticleView key={i} particle={particle} />
      ))}

      {/* Stage text */}
      <Animated.View
        entering={FadeIn.duration(400)}
        key={currentStage}
        style={styles.textContainer}
      >
        <Text style={styles.stageText}>{STAGES[currentStage].text}</Text>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, animatedProgressStyle]}>
            <LinearGradient
              colors={colors.gradients.primary}
              style={styles.progressGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressText}>
          Step {currentStage + 1} of {STAGES.length}
        </Text>
      </View>
    </Animated.View>
  );
}

function ParticleView({
  particle,
}: {
  particle: {
    x: Animated.SharedValue<number>;
    y: Animated.SharedValue<number>;
    opacity: Animated.SharedValue<number>;
    scale: Animated.SharedValue<number>;
  };
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: particle.x.value },
      { translateY: particle.y.value },
      { scale: particle.scale.value },
    ],
    opacity: particle.opacity.value,
  }));

  return (
    <Animated.View style={[styles.particle, animatedStyle]}>
      <Ionicons name="sparkles" size={12} color={colors.primary[400]} />
    </Animated.View>
  );
}

// Alternative: Simplified card-based loading state
export function PlanLoadingCard() {
  const shimmerX = useSharedValue(-1);
  const dotOpacity = [useSharedValue(0.3), useSharedValue(0.3), useSharedValue(0.3)];

  useEffect(() => {
    // Shimmer animation
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );

    // Dot animation
    dotOpacity.forEach((dot, i) => {
      dot.value = withDelay(
        i * 200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0.3, { duration: 400 })
          ),
          -1,
          true
        )
      );
    });
  }, []);

  return (
    <View style={cardStyles.container}>
      <View style={cardStyles.iconRow}>
        <View style={cardStyles.iconCircle}>
          <Ionicons name="sparkles" size={24} color={colors.primary[500]} />
        </View>
        <View style={cardStyles.dotsContainer}>
          {dotOpacity.map((dot, i) => {
            const animatedDotStyle = useAnimatedStyle(() => ({
              opacity: dot.value,
            }));
            return (
              <Animated.View key={i} style={[cardStyles.dot, animatedDotStyle]} />
            );
          })}
        </View>
      </View>
      <Text style={cardStyles.title}>Creating your plans</Text>
      <Text style={cardStyles.subtitle}>
        Analyzing your preferences and finding the best activities...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[8],
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
  },
  glowGradient: {
    flex: 1,
    borderRadius: 100,
  },
  orbitContainer: {
    position: 'absolute',
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitDot: {
    position: 'absolute',
    top: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[400],
  },
  orbitDotOpposite: {
    top: 'auto',
    bottom: -4,
    backgroundColor: colors.accent.violet.base,
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particle: {
    position: 'absolute',
  },
  textContainer: {
    marginTop: spacing[6],
    alignItems: 'center',
  },
  stageText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: spacing[12],
    left: spacing[8],
    right: spacing[8],
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.neutral[200],
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressText: {
    marginTop: spacing[2],
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
  },
});

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.xl,
    padding: spacing[6],
    margin: spacing[5],
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginLeft: spacing[3],
    gap: spacing[1],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[400],
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
});

export default PlanGenerationLoader;
