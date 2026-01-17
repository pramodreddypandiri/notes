/**
 * SkeletonLoader - Premium skeleton loading component
 *
 * Features:
 * - Smooth shimmer animation
 * - Multiple preset shapes
 * - Composable for complex layouts
 * - Customizable colors and dimensions
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, spacing } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

// Base skeleton component with shimmer
export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.md,
  style,
}: SkeletonProps) {
  const shimmerX = useSharedValue(-1);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerX.value, [-1, 1], [-200, 200]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius: radius,
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            'rgba(255, 255, 255, 0.4)',
            'transparent',
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
}

// Preset: Note card skeleton
export function NoteCardSkeleton() {
  return (
    <View style={skeletonStyles.noteCard}>
      <View style={skeletonStyles.noteContent}>
        <Skeleton width="90%" height={18} />
        <Skeleton width="60%" height={14} style={{ marginTop: spacing[2] }} />
        <View style={skeletonStyles.tagRow}>
          <Skeleton width={70} height={24} borderRadius={borderRadius.full} />
          <Skeleton width={50} height={24} borderRadius={borderRadius.full} />
        </View>
      </View>
      <View style={skeletonStyles.noteActions}>
        <Skeleton width={32} height={32} borderRadius={borderRadius.full} />
        <Skeleton width={32} height={32} borderRadius={borderRadius.full} />
      </View>
    </View>
  );
}

// Preset: Plan card skeleton
export function PlanCardSkeleton() {
  return (
    <View style={skeletonStyles.planCard}>
      <Skeleton width="70%" height={24} />
      <Skeleton width="40%" height={16} style={{ marginTop: spacing[2] }} />

      {/* Activities */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={skeletonStyles.activity}>
          <Skeleton width={60} height={16} />
          <View style={skeletonStyles.activityDetails}>
            <Skeleton width="80%" height={18} />
            <Skeleton width="50%" height={14} style={{ marginTop: spacing[1] }} />
          </View>
        </View>
      ))}

      {/* Reasoning */}
      <View style={skeletonStyles.reasoning}>
        <Skeleton width="100%" height={40} borderRadius={borderRadius.md} />
      </View>

      {/* Feedback buttons */}
      <View style={skeletonStyles.feedbackRow}>
        <Skeleton width="45%" height={48} borderRadius={borderRadius.md} />
        <Skeleton width="45%" height={48} borderRadius={borderRadius.md} />
      </View>
    </View>
  );
}

// Preset: Settings row skeleton
export function SettingsRowSkeleton() {
  return (
    <View style={skeletonStyles.settingsRow}>
      <Skeleton width="30%" height={14} />
      <Skeleton width="50%" height={18} style={{ marginTop: spacing[2] }} />
    </View>
  );
}

// Preset: Full screen loading with multiple skeletons
export function NotesListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <NoteCardSkeleton key={i} />
      ))}
    </View>
  );
}

export function PlansListSkeleton({ count = 2 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <PlanCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.neutral[200],
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
});

const skeletonStyles = StyleSheet.create({
  noteCard: {
    backgroundColor: colors.neutral[0],
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    marginBottom: spacing[3],
  },
  noteContent: {
    flex: 1,
    marginRight: spacing[3],
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  noteActions: {
    gap: spacing[2],
  },
  planCard: {
    backgroundColor: colors.neutral[0],
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[4],
  },
  activity: {
    flexDirection: 'row',
    marginTop: spacing[4],
    paddingTop: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  activityDetails: {
    flex: 1,
    marginLeft: spacing[3],
  },
  reasoning: {
    marginTop: spacing[4],
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[4],
  },
  settingsRow: {
    paddingVertical: spacing[3],
  },
  list: {
    padding: spacing[5],
  },
});

export default Skeleton;
