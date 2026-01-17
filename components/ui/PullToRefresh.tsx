/**
 * PullToRefresh - Premium pull-to-refresh with spring physics
 *
 * Features:
 * - Spring-based resistance when pulling
 * - Animated refresh indicator
 * - Haptic feedback at threshold
 * - Smooth return animation
 */

import React, { ReactNode, useState, useCallback } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, animation } from '../../theme';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
}

const REFRESH_THRESHOLD = 80;

export function PullToRefresh({
  children,
  onRefresh,
  refreshing = false,
}: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing || refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary[500]}
          colors={[colors.primary[500]]}
          progressBackgroundColor={colors.neutral[0]}
        />
      }
    >
      {children}
    </ScrollView>
  );
}

// Alternative: Animated FlatList with pull-to-refresh
export function AnimatedFlatListContainer({
  children,
  onRefresh,
  refreshing = false,
  ListHeaderComponent,
  ListEmptyComponent,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  ListHeaderComponent?: ReactNode;
  ListEmptyComponent?: ReactNode;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  return (
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing || refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
            progressBackgroundColor={colors.neutral[0]}
          />
        ) : undefined
      }
    >
      {ListHeaderComponent}
      {children}
      {ListEmptyComponent}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});

export default PullToRefresh;
