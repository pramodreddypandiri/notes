/**
 * PlanCard - Premium animated plan card component
 *
 * Features:
 * - Staggered entrance animation
 * - Activity timeline visualization
 * - Interactive feedback buttons
 * - Expandable reasoning section
 * - Swipe actions
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDelay,
  FadeInDown,
  Layout,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import AnimatedPressable from '../ui/AnimatedPressable';
import { colors, typography, spacing, borderRadius, shadows, animation } from '../../theme';

interface Activity {
  time: string;
  name: string;
  address: string;
  duration: string;
  type?: string;
}

interface Plan {
  id: string;
  plan_data: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    activities: Activity[];
    reasoning: string;
    totalDistance?: string;
  };
}

interface PlanCardProps {
  plan: Plan;
  index: number;
  onFeedback: (planId: string, rating: 'up' | 'down') => void;
}

export function PlanCard({ plan, index, onFeedback }: PlanCardProps) {
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);

  // Animation values
  const cardScale = useSharedValue(1);
  const likeScale = useSharedValue(1);
  const dislikeScale = useSharedValue(1);

  const handleFeedback = (rating: 'up' | 'down') => {
    if (feedbackGiven) return;

    setFeedbackGiven(rating);
    Haptics.notificationAsync(
      rating === 'up'
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    onFeedback(plan.id, rating);

    // Animate the selected button
    const targetScale = rating === 'up' ? likeScale : dislikeScale;
    targetScale.value = withSpring(1.2, animation.spring.bouncy);
    setTimeout(() => {
      targetScale.value = withSpring(1, animation.spring.default);
    }, 200);
  };

  const animatedLikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const animatedDislikeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dislikeScale.value }],
  }));

  const { plan_data } = plan;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 150).springify().damping(15)}
      layout={Layout.springify()}
      style={[styles.card, shadows.lg]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{plan_data.title}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary[500]} />
            <Text style={styles.dateText}>{plan_data.date}</Text>
            <View style={styles.dateDot} />
            <Ionicons name="time-outline" size={14} color={colors.neutral[500]} />
            <Text style={styles.timeText}>
              {plan_data.startTime} - {plan_data.endTime}
            </Text>
          </View>
        </View>
        <View style={styles.headerBadge}>
          <LinearGradient
            colors={colors.gradients.primary}
            style={styles.badgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="sparkles" size={16} color={colors.neutral[0]} />
          </LinearGradient>
        </View>
      </View>

      {/* Activities Timeline */}
      <View style={styles.timeline}>
        {plan_data.activities.map((activity, actIndex) => (
          <ActivityItem
            key={actIndex}
            activity={activity}
            isLast={actIndex === plan_data.activities.length - 1}
            index={actIndex}
          />
        ))}
      </View>

      {/* Reasoning */}
      <AnimatedPressable
        onPress={() => setShowFullReasoning(!showFullReasoning)}
        style={styles.reasoningContainer}
        hapticType="light"
        scaleIntensity="subtle"
      >
        <View style={styles.reasoningHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.accent.amber.base} />
          <Text style={styles.reasoningLabel}>Why this plan?</Text>
          <Ionicons
            name={showFullReasoning ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={colors.neutral[400]}
          />
        </View>
        <Text
          style={styles.reasoningText}
          numberOfLines={showFullReasoning ? undefined : 2}
        >
          {plan_data.reasoning}
        </Text>
      </AnimatedPressable>

      {/* Distance info */}
      {plan_data.totalDistance && (
        <View style={styles.distanceRow}>
          <Ionicons name="walk-outline" size={14} color={colors.neutral[500]} />
          <Text style={styles.distanceText}>
            Total distance: {plan_data.totalDistance}
          </Text>
        </View>
      )}

      {/* Feedback Buttons */}
      <View style={styles.feedbackContainer}>
        <Animated.View style={[styles.feedbackButtonWrapper, animatedLikeStyle]}>
          <AnimatedPressable
            onPress={() => handleFeedback('up')}
            disabled={!!feedbackGiven}
            style={[
              styles.feedbackButton,
              styles.feedbackUp,
              feedbackGiven === 'up' && styles.feedbackSelected,
              feedbackGiven === 'down' && styles.feedbackDimmed,
            ]}
            hapticType="medium"
          >
            <Ionicons
              name={feedbackGiven === 'up' ? 'heart' : 'heart-outline'}
              size={20}
              color={feedbackGiven === 'up' ? colors.neutral[0] : colors.accent.emerald.base}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: feedbackGiven === 'up' ? colors.neutral[0] : colors.accent.emerald.base },
              ]}
            >
              Love it
            </Text>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View style={[styles.feedbackButtonWrapper, animatedDislikeStyle]}>
          <AnimatedPressable
            onPress={() => handleFeedback('down')}
            disabled={!!feedbackGiven}
            style={[
              styles.feedbackButton,
              styles.feedbackDown,
              feedbackGiven === 'down' && styles.feedbackSelectedDown,
              feedbackGiven === 'up' && styles.feedbackDimmed,
            ]}
            hapticType="medium"
          >
            <Ionicons
              name={feedbackGiven === 'down' ? 'close-circle' : 'close-circle-outline'}
              size={20}
              color={feedbackGiven === 'down' ? colors.neutral[0] : colors.neutral[500]}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: feedbackGiven === 'down' ? colors.neutral[0] : colors.neutral[500] },
              ]}
            >
              Not for me
            </Text>
          </AnimatedPressable>
        </Animated.View>
      </View>

      {/* Feedback confirmation */}
      {feedbackGiven && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.feedbackConfirmation}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={colors.accent.emerald.base}
          />
          <Text style={styles.feedbackConfirmationText}>
            Thanks! We'll use this to improve your plans.
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

interface ActivityItemProps {
  activity: Activity;
  isLast: boolean;
  index: number;
}

function ActivityItem({ activity, isLast, index }: ActivityItemProps) {
  return (
    <View style={styles.activityItem}>
      {/* Timeline connector */}
      <View style={styles.timelineConnector}>
        <View style={styles.timelineDot} />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      {/* Activity content */}
      <View style={styles.activityContent}>
        <Text style={styles.activityTime}>{activity.time}</Text>
        <Text style={styles.activityName}>{activity.name}</Text>
        <View style={styles.activityMeta}>
          <Ionicons name="location-outline" size={12} color={colors.neutral[400]} />
          <Text style={styles.activityAddress}>{activity.address}</Text>
        </View>
        <View style={styles.activityDurationBadge}>
          <Ionicons name="time-outline" size={10} color={colors.primary[500]} />
          <Text style={styles.activityDuration}>{activity.duration}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  dateText: {
    fontSize: typography.fontSize.sm,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  dateDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.neutral[300],
    marginHorizontal: spacing[1],
  },
  timeText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  headerBadge: {
    marginLeft: spacing[3],
  },
  badgeGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeline: {
    marginBottom: spacing[4],
  },
  activityItem: {
    flexDirection: 'row',
  },
  timelineConnector: {
    width: 20,
    alignItems: 'center',
    marginRight: spacing[3],
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary[500],
    borderWidth: 2,
    borderColor: colors.primary[100],
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.primary[100],
    marginVertical: spacing[1],
  },
  activityContent: {
    flex: 1,
    paddingBottom: spacing[4],
  },
  activityTime: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
    marginBottom: spacing[1],
  },
  activityName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[2],
  },
  activityAddress: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    flex: 1,
  },
  activityDurationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  activityDuration: {
    fontSize: typography.fontSize.xs,
    color: colors.primary[600],
    fontWeight: typography.fontWeight.medium,
  },
  reasoningContainer: {
    backgroundColor: colors.accent.amber.light,
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  reasoningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[1],
  },
  reasoningLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent.amber.dark,
    flex: 1,
  },
  reasoningText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[700],
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[4],
  },
  distanceText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
  },
  feedbackContainer: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  feedbackButtonWrapper: {
    flex: 1,
  },
  feedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderRadius: borderRadius.md,
    gap: spacing[2],
    borderWidth: 1.5,
  },
  feedbackUp: {
    backgroundColor: colors.accent.emerald.light,
    borderColor: colors.accent.emerald.base,
  },
  feedbackDown: {
    backgroundColor: colors.neutral[100],
    borderColor: colors.neutral[300],
  },
  feedbackSelected: {
    backgroundColor: colors.accent.emerald.base,
    borderColor: colors.accent.emerald.base,
  },
  feedbackSelectedDown: {
    backgroundColor: colors.neutral[500],
    borderColor: colors.neutral[500],
  },
  feedbackDimmed: {
    opacity: 0.4,
  },
  feedbackText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  feedbackConfirmation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  feedbackConfirmationText: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    flex: 1,
  },
});

export default PlanCard;
