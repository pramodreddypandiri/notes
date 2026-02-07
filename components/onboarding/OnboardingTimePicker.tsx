/**
 * OnboardingTimePicker - Time selection component for onboarding
 *
 * Features:
 * - Native time picker experience
 * - Smooth animations
 * - Haptic feedback
 */

import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../theme';

interface OnboardingTimePickerProps {
  label: string;
  value: string | null; // HH:mm format
  onChange: (time: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function OnboardingTimePicker({
  label,
  value,
  onChange,
  icon = 'time-outline',
}: OnboardingTimePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const scale = useSharedValue(1);

  // Parse time string to Date
  const getDateFromTime = (timeStr: string | null): Date => {
    const date = new Date();
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      date.setHours(hours, minutes, 0, 0);
    }
    return date;
  };

  // Format Date to time string
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format time for display (12-hour format)
  const formatTimeDisplay = (timeStr: string | null): string => {
    if (!timeStr) return 'Select time';
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  };

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (event.type === 'set' && selectedDate) {
      const timeStr = formatTime(selectedDate);
      onChange(timeStr);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  const handlePressIn = () => {
    scale.value = withTiming(0.98, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
      >
        <Animated.View style={[styles.container, value && styles.containerSelected, containerStyle]}>
          <View style={[styles.iconContainer, value && styles.iconContainerSelected]}>
            <Ionicons
              name={icon}
              size={24}
              color={value ? colors.primary[600] : colors.neutral[500]}
            />
          </View>
          <Text style={[styles.timeText, value && styles.timeTextSelected]}>
            {formatTimeDisplay(value)}
          </Text>
          <Ionicons
            name="chevron-down"
            size={20}
            color={colors.neutral[400]}
          />
        </Animated.View>
      </Pressable>

      {showPicker && (
        <Animated.View entering={FadeIn.duration(200)}>
          {Platform.OS === 'ios' && (
            <View style={styles.pickerHeader}>
              <Pressable onPress={() => setShowPicker(false)} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>Done</Text>
              </Pressable>
            </View>
          )}
          <DateTimePicker
            value={getDateFromTime(value)}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            style={styles.picker}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[4],
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[600],
    marginBottom: spacing[2],
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    backgroundColor: colors.neutral[0],
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  containerSelected: {
    borderColor: colors.primary[400],
    backgroundColor: colors.primary[50],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  iconContainerSelected: {
    backgroundColor: colors.primary[100],
  },
  timeText: {
    flex: 1,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[400],
  },
  timeTextSelected: {
    color: colors.primary[700],
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    backgroundColor: colors.neutral[50],
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  doneButton: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
  },
  doneButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[600],
  },
  picker: {
    backgroundColor: colors.neutral[50],
  },
});

export default OnboardingTimePicker;
