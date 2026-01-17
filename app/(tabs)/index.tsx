/**
 * Home Screen - Premium notes interface with voice capture
 *
 * Features:
 * - Animated note cards with swipe-to-delete
 * - Premium voice capture experience
 * - Pull-to-refresh
 * - Skeleton loading states
 * - Bottom sheet tag selector
 * - Smooth transitions and haptic feedback
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Theme
import { colors, typography, spacing, borderRadius, shadows, layout } from '../../theme';

// Components
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import PremiumButton from '../../components/ui/PremiumButton';
import BottomSheet from '../../components/ui/BottomSheet';
import { NotesListSkeleton } from '../../components/ui/SkeletonLoader';
import NoteCard from '../../components/notes/NoteCard';
import VoiceCaptureSheet from '../../components/voice/VoiceCaptureSheet';
import VoiceRecordButton from '../../components/voice/VoiceRecordButton';

// Services
import voiceService from '../../services/voiceService';
import { createNote, getNotes } from '../../services/notesService';
import soundService from '../../services/soundService';

// Demo mode
const DEMO_MODE = true;

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

const DEMO_NOTES: Note[] = [
  {
    id: '1',
    transcript: 'I want to go bowling this weekend',
    parsed_data: { summary: 'Want to: go bowling', type: 'intent' },
    created_at: new Date().toISOString(),
    tags: ['preference'],
  },
  {
    id: '2',
    transcript: 'Try Mexican food',
    parsed_data: { summary: 'Preference: Mexican food', type: 'preference' },
    created_at: new Date(Date.now() - 3600000).toISOString(),
    tags: ['my_type'],
  },
  {
    id: '3',
    transcript: 'Email Jack about interview on Thursday',
    parsed_data: { summary: 'Task: Email Jack about interview', type: 'task' },
    created_at: new Date(Date.now() - 7200000).toISOString(),
    tags: ['reminder'],
    reminder_time: 'Thursday, 9:00 AM',
  },
];

const TAG_OPTIONS: {
  tag: NoteTag;
  title: string;
  description: string;
  icon: string;
}[] = [
  {
    tag: 'reminder',
    title: 'Reminder',
    description: 'Get notified at a specific time',
    icon: 'alarm',
  },
  {
    tag: 'preference',
    title: 'Preference',
    description: 'Things you like or want to try',
    icon: 'heart',
  },
  {
    tag: 'my_type',
    title: 'My Type',
    description: 'Activities that match your style',
    icon: 'star',
  },
  {
    tag: 'my_vibe',
    title: 'My Vibe',
    description: 'Mood and atmosphere preferences',
    icon: 'musical-notes',
  },
];

export default function HomeScreen() {
  const router = useRouter();

  // State
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notificationCount] = useState(2);

  // Voice capture state
  const [showVoiceCapture, setShowVoiceCapture] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tag modal state
  const [showTagSheet, setShowTagSheet] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Initialize
  useEffect(() => {
    loadNotes();
    soundService.initialize();
  }, []);

  const loadNotes = async () => {
    try {
      if (DEMO_MODE) {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        setNotes(DEMO_NOTES);
        return;
      }
      const data = await getNotes(20);
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes(DEMO_NOTES);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadNotes();
    setRefreshing(false);
  }, []);

  // Voice recording handlers
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      setIsProcessing(true);
      try {
        const audioUri = await voiceService.stopRecording();
        await soundService.playRecordStop();

        if (audioUri) {
          if (DEMO_MODE) {
            // Simulate processing
            await new Promise((resolve) => setTimeout(resolve, 1500));
            const newNote: Note = {
              id: Date.now().toString(),
              transcript: 'New voice note recorded',
              parsed_data: {
                summary: 'Voice note captured (demo mode)',
                type: 'intent',
              },
              created_at: new Date().toISOString(),
            };
            setNotes([newNote, ...notes]);
            await soundService.playSuccess();
          } else {
            const transcript =
              'Audio recorded - transcription not implemented yet';
            await createNote(transcript, audioUri);
            await loadNotes();
          }
        }
      } catch (error) {
        console.error('Recording error:', error);
        await soundService.playError();
      } finally {
        setIsRecording(false);
        setIsProcessing(false);
        setShowVoiceCapture(false);
      }
    } else {
      // Start recording
      try {
        await voiceService.startRecording();
        await soundService.playRecordStart();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
        Alert.alert('Error', 'Failed to start recording. Please check permissions.');
      }
    }
  };

  const handleOpenVoiceCapture = () => {
    setShowVoiceCapture(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCloseVoiceCapture = () => {
    if (isRecording) {
      voiceService.cancelRecording();
      setIsRecording(false);
    }
    setShowVoiceCapture(false);
  };

  // Note actions
  const handleDeleteNote = (noteId: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setNotes(notes.filter((note) => note.id !== noteId));
        },
      },
    ]);
  };

  const handleTagPress = (noteId: string) => {
    setSelectedNoteId(noteId);
    setShowTagSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const applyTag = (tag: NoteTag) => {
    if (!selectedNoteId) return;

    setNotes(
      notes.map((note) => {
        if (note.id === selectedNoteId) {
          const currentTags = note.tags || [];
          const hasTag = currentTags.includes(tag);

          return {
            ...note,
            tags: hasTag
              ? currentTags.filter((t) => t !== tag)
              : [...currentTags, tag],
          };
        }
        return note;
      })
    );

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTagSheet(false);
    setSelectedNoteId(null);
  };

  const navigateToPlans = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/plans');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={colors.gradients.primary as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <Animated.View
          entering={FadeInDown.duration(500)}
          style={styles.headerContent}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Good day</Text>
              <Text style={styles.title}>Weekend Planner</Text>
            </View>

            {notificationCount > 0 && (
              <AnimatedPressable
                style={styles.notificationButton}
                hapticType="light"
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={colors.neutral[0]}
                />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {notificationCount}
                  </Text>
                </View>
              </AnimatedPressable>
            )}
          </View>

          <AnimatedPressable
            onPress={navigateToPlans}
            style={styles.planButton}
            hapticType="medium"
            scaleIntensity="subtle"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
              style={styles.planButtonGradient}
            >
              <Ionicons
                name="sparkles"
                size={20}
                color={colors.neutral[0]}
              />
              <Text style={styles.planButtonText}>Plan My Weekend</Text>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.neutral[0]}
              />
            </LinearGradient>
          </AnimatedPressable>
        </Animated.View>
      </LinearGradient>

      {/* Notes List */}
      <View style={styles.notesSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Notes</Text>
          <Text style={styles.noteCount}>{notes.length} notes</Text>
        </View>

        {loading ? (
          <NotesListSkeleton count={3} />
        ) : (
          <Animated.ScrollView
            entering={FadeIn.delay(300)}
            style={styles.notesList}
            contentContainerStyle={styles.notesListContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary[500]}
                colors={[colors.primary[500]]}
              />
            }
          >
            {notes.length === 0 ? (
              <EmptyState onRecord={handleOpenVoiceCapture} />
            ) : (
              notes.map((note, index) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={index}
                  onDelete={handleDeleteNote}
                  onTagPress={handleTagPress}
                />
              ))
            )}
          </Animated.ScrollView>
        )}
      </View>

      {/* Bottom Recording Bar */}
      <Animated.View
        entering={SlideInRight.delay(500).springify()}
        style={styles.bottomBar}
      >
        <View style={styles.recordButtonContainer}>
          <VoiceRecordButton
            isRecording={false}
            isProcessing={false}
            onPress={handleOpenVoiceCapture}
            size={64}
          />
        </View>
      </Animated.View>

      {/* Voice Capture Sheet */}
      <VoiceCaptureSheet
        visible={showVoiceCapture}
        onClose={handleCloseVoiceCapture}
        onCaptureComplete={(uri) => console.log('Captured:', uri)}
        isRecording={isRecording}
        isProcessing={isProcessing}
        onToggleRecording={handleToggleRecording}
      />

      {/* Tag Selection Bottom Sheet */}
      <BottomSheet
        visible={showTagSheet}
        onClose={() => {
          setShowTagSheet(false);
          setSelectedNoteId(null);
        }}
        height={55}
      >
        <Text style={styles.sheetTitle}>Tag Note</Text>
        <Text style={styles.sheetSubtitle}>
          Choose a tag to organize your note
        </Text>

        <View style={styles.tagOptions}>
          {TAG_OPTIONS.map((option, index) => (
            <TagOption
              key={option.tag}
              option={option}
              index={index}
              onPress={() => applyTag(option.tag)}
              isSelected={
                selectedNoteId
                  ? notes
                      .find((n) => n.id === selectedNoteId)
                      ?.tags?.includes(option.tag) || false
                  : false
              }
            />
          ))}
        </View>
      </BottomSheet>
    </View>
  );
}

// Tag Option Component
function TagOption({
  option,
  index,
  onPress,
  isSelected,
}: {
  option: (typeof TAG_OPTIONS)[0];
  index: number;
  onPress: () => void;
  isSelected: boolean;
}) {
  const tagColor = {
    reminder: colors.accent.rose,
    preference: colors.accent.emerald,
    my_type: colors.accent.violet,
    my_vibe: colors.accent.amber,
  }[option.tag];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <AnimatedPressable
        onPress={onPress}
        style={[
          styles.tagOption,
          {
            backgroundColor: isSelected ? tagColor.light : colors.neutral[50],
            borderColor: isSelected ? tagColor.base : colors.neutral[200],
          },
        ]}
        hapticType="light"
      >
        <View
          style={[
            styles.tagOptionIcon,
            { backgroundColor: tagColor.light },
          ]}
        >
          <Ionicons
            name={option.icon as any}
            size={20}
            color={tagColor.base}
          />
        </View>
        <View style={styles.tagOptionText}>
          <Text style={styles.tagOptionTitle}>{option.title}</Text>
          <Text style={styles.tagOptionDesc}>{option.description}</Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={tagColor.base}
          />
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

// Empty State Component
function EmptyState({ onRecord }: { onRecord: () => void }) {
  return (
    <Animated.View
      entering={FadeIn.delay(300)}
      style={styles.emptyState}
    >
      <View style={styles.emptyIcon}>
        <Ionicons name="mic-outline" size={48} color={colors.primary[300]} />
      </View>
      <Text style={styles.emptyTitle}>No notes yet</Text>
      <Text style={styles.emptyText}>
        Tap the microphone to capture your first note
      </Text>
      <PremiumButton
        onPress={onRecord}
        gradient
        icon={<Ionicons name="mic" size={20} color={colors.neutral[0]} />}
      >
        Start Recording
      </PremiumButton>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    paddingTop: layout.statusBarOffset + spacing[4],
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[5],
  },
  headerContent: {
    gap: spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing[1],
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.semantic.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  planButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  planButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
    gap: spacing[2],
  },
  planButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[0],
    flex: 1,
  },
  notesSection: {
    flex: 1,
    paddingTop: spacing[5],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
  },
  noteCount: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  notesList: {
    flex: 1,
  },
  notesListContent: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[24],
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: spacing[4],
    paddingBottom: spacing[8],
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
    ...shadows.lg,
  },
  recordButtonContainer: {
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
    paddingTop: spacing[12],
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing[6],
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  sheetTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  sheetSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginBottom: spacing[5],
  },
  tagOptions: {
    gap: spacing[3],
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing[3],
  },
  tagOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagOptionText: {
    flex: 1,
  },
  tagOptionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: 2,
  },
  tagOptionDesc: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
});
