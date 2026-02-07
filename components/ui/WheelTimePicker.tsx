/**
 * WheelTimePicker - iOS-style wheel time picker
 *
 * A modal time picker with scrollable wheels for hours, minutes, and AM/PM.
 * Features a dark theme with highlighted selection indicator.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ListRenderItem,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import AnimatedPressable from './AnimatedPressable';
import { colors, typography, spacing, borderRadius } from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface WheelTimePickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
  initialTime?: string; // Format: "HH:MM" (24-hour)
  title?: string;
}

// Generate arrays for picker columns
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1-12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0-59
const PERIODS = ['AM', 'PM'];

// Convert 24-hour time to 12-hour components
const parse24HourTime = (time: string): { hour: number; minute: number; period: 'AM' | 'PM' } => {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return { hour: hour12, minute: m, period };
};

// Convert 12-hour components to 24-hour time string
const to24HourTime = (hour: number, minute: number, period: 'AM' | 'PM'): string => {
  let hour24 = hour;
  if (period === 'AM' && hour === 12) {
    hour24 = 0;
  } else if (period === 'PM' && hour !== 12) {
    hour24 = hour + 12;
  }
  return `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

interface WheelColumnProps<T> {
  data: T[];
  selectedValue: T;
  onValueChange: (value: T) => void;
  formatValue?: (value: T) => string;
  width: number;
}

function WheelColumn<T>({
  data,
  selectedValue,
  onValueChange,
  formatValue = (v) => String(v),
  width,
}: WheelColumnProps<T>) {
  const flatListRef = useRef<FlatList<T>>(null);
  const selectedIndex = data.indexOf(selectedValue);
  const [isScrolling, setIsScrolling] = useState(false);

  // Scroll to selected value on mount and when selectedValue changes externally
  useEffect(() => {
    if (!isScrolling && flatListRef.current && selectedIndex >= 0) {
      flatListRef.current.scrollToIndex({
        index: selectedIndex,
        animated: false,
      });
    }
  }, [selectedIndex, isScrolling]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, data.length - 1));

      if (data[clampedIndex] !== selectedValue) {
        Haptics.selectionAsync();
        onValueChange(data[clampedIndex]);
      }
      setIsScrolling(false);
    },
    [data, selectedValue, onValueChange]
  );

  const handleScrollBegin = useCallback(() => {
    setIsScrolling(true);
  }, []);

  const renderItem: ListRenderItem<T> = useCallback(
    ({ item, index }) => {
      const isSelected = item === selectedValue;
      return (
        <View style={[styles.wheelItem, { width, height: ITEM_HEIGHT }]}>
          <Text
            style={[
              styles.wheelItemText,
              isSelected && styles.wheelItemTextSelected,
            ]}
          >
            {formatValue(item)}
          </Text>
        </View>
      );
    },
    [selectedValue, formatValue, width]
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<T> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <View style={[styles.wheelColumn, { width, height: PICKER_HEIGHT }]}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item}-${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onScrollBeginDrag={handleScrollBegin}
        onMomentumScrollEnd={handleScrollEnd}
        getItemLayout={getItemLayout}
        initialScrollIndex={selectedIndex >= 0 ? selectedIndex : 0}
        contentContainerStyle={{
          paddingVertical: ITEM_HEIGHT * 2, // 2 items padding on each side
        }}
      />
    </View>
  );
}

export default function WheelTimePicker({
  visible,
  onClose,
  onConfirm,
  initialTime = '12:00',
  title = 'Select Time',
}: WheelTimePickerProps) {
  const initial = parse24HourTime(initialTime);
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>(initial.period);

  // Update state when initialTime changes
  useEffect(() => {
    const parsed = parse24HourTime(initialTime);
    setSelectedHour(parsed.hour);
    setSelectedMinute(parsed.minute);
    setSelectedPeriod(parsed.period);
  }, [initialTime]);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const time24 = to24HourTime(selectedHour, selectedMinute, selectedPeriod);
    onConfirm(time24);
    onClose();
  }, [selectedHour, selectedMinute, selectedPeriod, onConfirm, onClose]);

  const handleCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  const columnWidth = (SCREEN_WIDTH - spacing[8] * 2) / 3;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.overlay}
      >
        <Pressable
          style={styles.backdrop}
          onPress={handleCancel}
        />

        <Animated.View
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <AnimatedPressable
              onPress={handleCancel}
              style={styles.headerButton}
              hapticType="light"
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </AnimatedPressable>

            <Text style={styles.title}>{title}</Text>

            <AnimatedPressable
              onPress={handleConfirm}
              style={styles.headerButton}
              hapticType="medium"
            >
              <Text style={styles.confirmText}>Done</Text>
            </AnimatedPressable>
          </View>

          {/* Picker */}
          <View style={styles.pickerContainer}>
            {/* Selection indicator */}
            <View style={styles.selectionIndicator} pointerEvents="none" />

            {/* Wheel columns */}
            <View style={styles.wheelsContainer}>
              <WheelColumn
                data={HOURS}
                selectedValue={selectedHour}
                onValueChange={setSelectedHour}
                width={columnWidth}
              />
              <WheelColumn
                data={MINUTES}
                selectedValue={selectedMinute}
                onValueChange={setSelectedMinute}
                formatValue={(v) => String(v).padStart(2, '0')}
                width={columnWidth}
              />
              <WheelColumn
                data={PERIODS}
                selectedValue={selectedPeriod}
                onValueChange={setSelectedPeriod as (v: string) => void}
                width={columnWidth}
              />
            </View>

            {/* Top and bottom fade gradients */}
            <View style={[styles.fadeGradient, styles.fadeTop]} pointerEvents="none" />
            <View style={[styles.fadeGradient, styles.fadeBottom]} pointerEvents="none" />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  container: {
    backgroundColor: colors.neutral[900],
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingBottom: spacing[8],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[700],
  },
  headerButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[2],
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[0],
  },
  cancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[400],
  },
  confirmText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary[400],
  },
  pickerContainer: {
    height: PICKER_HEIGHT,
    marginHorizontal: spacing[8],
    marginTop: spacing[4],
    position: 'relative',
  },
  selectionIndicator: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    backgroundColor: colors.neutral[800],
    borderRadius: borderRadius.lg,
    zIndex: 0,
  },
  wheelsContainer: {
    flexDirection: 'row',
    height: PICKER_HEIGHT,
    zIndex: 1,
  },
  wheelColumn: {
    overflow: 'hidden',
  },
  wheelItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelItemText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[500],
  },
  wheelItemTextSelected: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  fadeGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM_HEIGHT * 1.5,
    zIndex: 2,
  },
  fadeTop: {
    top: 0,
    backgroundColor: 'transparent',
    // Using linear gradient would be better, but for simplicity we skip it
  },
  fadeBottom: {
    bottom: 0,
    backgroundColor: 'transparent',
  },
});
