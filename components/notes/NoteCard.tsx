/**
 * NoteCard - Premium animated note card with swipe actions
 *
 * Features:
 * - Swipe to delete with haptic feedback
 * - Tag display with colored badges
 * - Reminder time indicator
 * - Long-press for quick actions
 * - Smooth entrance animation
 */

import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  FadeInRight,
  FadeOutLeft,
  Layout,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AnimatedPressable from '../ui/AnimatedPressable';
import { colors, typography, spacing, borderRadius, shadows, animation, tagColors } from '../../theme';

type NoteTag = 'reminder' | 'preference' | 'my_type' | 'my_vibe';

interface Note {
  id: string;
  transcript: string;
  parsed_data?: {
    summary: string;
    type: string;
  };
  created_at: string;
  tags?: NoteTag[];
  reminder_time?: string;
}

interface NoteCardProps {
  note: Note;
  index: number;
  onDelete: (id: string) => void;
  onTagPress: (id: string) => void;
  onPress?: (id: string) => void;
}

const SWIPE_THRESHOLD = 80;
const DELETE_THRESHOLD = 120;

const TAG_ICONS: Record<NoteTag, string> = {
  reminder: 'alarm',
  preference: 'heart',
  my_type: 'star',
  my_vibe: 'musical-notes',
};

const TAG_LABELS: Record<NoteTag, string> = {
  reminder: 'Reminder',
  preference: 'Preference',
  my_type: 'My Type',
  my_vibe: 'My Vibe',
};

export function NoteCard({
  note,
  index,
  onDelete,
  onTagPress,
  onPress,
}: NoteCardProps) {
  const translateX = useSharedValue(0);
  const deleteProgress = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  const triggerDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDelete(note.id);
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      'worklet';
      if (isDeleting.value) return;

      // Only allow swiping left
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -DELETE_THRESHOLD);
        deleteProgress.value = Math.min(
          Math.abs(event.translationX) / SWIPE_THRESHOLD,
          1
        );
      }
    })
    .onEnd((event) => {
      'worklet';
      if (isDeleting.value) return;

      if (event.translationX < -SWIPE_THRESHOLD) {
        // Confirm delete
        isDeleting.value = true;
        translateX.value = withTiming(-400, { duration: animation.duration.normal });
        runOnJS(triggerDelete)();
      } else {
        // Snap back
        translateX.value = withSpring(0, animation.spring.default);
        deleteProgress.value = withTiming(0, { duration: animation.duration.fast });
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    opacity: deleteProgress.value,
    transform: [{ scale: 0.8 + deleteProgress.value * 0.2 }],
  }));

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 50).springify().damping(15)}
      exiting={FadeOutLeft.duration(200)}
      layout={Layout.springify()}
      style={styles.container}
    >
      {/* Delete indicator */}
      <Animated.View style={[styles.deleteIndicator, animatedDeleteStyle]}>
        <Ionicons name="trash" size={24} color={colors.neutral[0]} />
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>

      {/* Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.card, shadows.md, animatedCardStyle]}>
          <AnimatedPressable
            onPress={() => onPress?.(note.id)}
            onLongPress={() => onTagPress(note.id)}
            style={styles.cardContent}
            hapticType="light"
            scaleIntensity="subtle"
          >
            <View style={styles.mainContent}>
              {/* Note text */}
              <Text style={styles.noteText} numberOfLines={2}>
                {note.parsed_data?.summary || note.transcript}
              </Text>

              {/* Timestamp */}
              <Text style={styles.timestamp}>{formatTime(note.created_at)}</Text>

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {note.tags.map((tag) => (
                    <View
                      key={tag}
                      style={[
                        styles.tag,
                        { backgroundColor: tagColors[tag].background },
                      ]}
                    >
                      <Ionicons
                        name={TAG_ICONS[tag] as any}
                        size={12}
                        color={tagColors[tag].icon}
                      />
                      <Text style={[styles.tagText, { color: tagColors[tag].text }]}>
                        {TAG_LABELS[tag]}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Reminder time */}
              {note.reminder_time && (
                <View style={styles.reminderContainer}>
                  <View style={styles.reminderBadge}>
                    <Ionicons name="time" size={12} color={colors.primary[500]} />
                    <Text style={styles.reminderText}>{note.reminder_time}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <AnimatedPressable
                onPress={() => onTagPress(note.id)}
                style={styles.actionButton}
                hapticType="light"
              >
                <Ionicons name="pricetag-outline" size={20} color={colors.primary[500]} />
              </AnimatedPressable>
            </View>
          </AnimatedPressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[3],
    position: 'relative',
  },
  deleteIndicator: {
    position: 'absolute',
    right: spacing[4],
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.semantic.error,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    gap: spacing[1],
  },
  deleteText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[0],
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: spacing[4],
  },
  mainContent: {
    flex: 1,
    marginRight: spacing[3],
  },
  noteText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[900],
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[400],
    marginTop: spacing[2],
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  reminderContainer: {
    marginTop: spacing[3],
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  reminderText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary[600],
  },
  actions: {
    justifyContent: 'flex-start',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NoteCard;
