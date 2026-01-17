/**
 * VoiceWaveform - Animated waveform visualization for voice recording
 *
 * Features:
 * - Smooth, organic waveform animation
 * - Responds to recording state
 * - Multiple animation modes (idle, recording, processing)
 * - Customizable colors and sizes
 */

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { colors, animation } from '../../theme';

interface VoiceWaveformProps {
  isRecording: boolean;
  isProcessing?: boolean;
  barCount?: number;
  barWidth?: number;
  barGap?: number;
  minHeight?: number;
  maxHeight?: number;
  color?: string;
  processingColor?: string;
}

export function VoiceWaveform({
  isRecording,
  isProcessing = false,
  barCount = 24,
  barWidth = 3,
  barGap = 2,
  minHeight = 8,
  maxHeight = 40,
  color = colors.primary[500],
  processingColor = colors.accent.violet.base,
}: VoiceWaveformProps) {
  // Create shared values for each bar
  const bars = Array.from({ length: barCount }, (_, i) => {
    const height = useSharedValue(minHeight);
    return { height, index: i };
  });

  useEffect(() => {
    if (isProcessing) {
      // Processing animation - sequential pulse
      bars.forEach(({ height, index }) => {
        const delay = index * 50;
        height.value = withRepeat(
          withDelay(
            delay,
            withSequence(
              withTiming(maxHeight * 0.6, { duration: 300, easing: Easing.inOut(Easing.ease) }),
              withTiming(minHeight, { duration: 300, easing: Easing.inOut(Easing.ease) })
            )
          ),
          -1,
          true
        );
      });
    } else if (isRecording) {
      // Recording animation - organic randomized movement
      bars.forEach(({ height, index }) => {
        const animateBar = () => {
          // Create organic-feeling random heights
          const centerWeight = 1 - Math.abs((index - barCount / 2) / (barCount / 2));
          const randomFactor = 0.3 + Math.random() * 0.7;
          const targetHeight = minHeight + (maxHeight - minHeight) * centerWeight * randomFactor;
          const duration = 150 + Math.random() * 200;

          height.value = withTiming(targetHeight, {
            duration,
            easing: Easing.inOut(Easing.sin),
          });
        };

        // Initial animation
        animateBar();

        // Set up interval for continuous animation
        const interval = setInterval(animateBar, 200 + Math.random() * 150);
        return () => clearInterval(interval);
      });
    } else {
      // Idle state - subtle breathing animation
      bars.forEach(({ height, index }) => {
        const delay = index * 30;
        const idleHeight = minHeight + (index % 3) * 2;
        height.value = withDelay(
          delay,
          withSpring(idleHeight, animation.spring.gentle)
        );
      });
    }

    return () => {
      bars.forEach(({ height }) => {
        cancelAnimation(height);
      });
    };
  }, [isRecording, isProcessing]);

  return (
    <View style={styles.container}>
      {bars.map(({ height, index }) => (
        <WaveformBar
          key={index}
          height={height}
          width={barWidth}
          gap={barGap}
          color={isProcessing ? processingColor : color}
          isFirst={index === 0}
        />
      ))}
    </View>
  );
}

interface WaveformBarProps {
  height: Animated.SharedValue<number>;
  width: number;
  gap: number;
  color: string;
  isFirst: boolean;
}

function WaveformBar({ height, width, gap, color, isFirst }: WaveformBarProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    width,
    marginLeft: isFirst ? 0 : gap,
    backgroundColor: color,
    borderRadius: width / 2,
  }));

  return <Animated.View style={animatedStyle} />;
}

// Circular pulsing waveform alternative
export function CircularWaveform({
  isRecording,
  size = 120,
  color = colors.primary[500],
}: {
  isRecording: boolean;
  size?: number;
  color?: string;
}) {
  const scale1 = useSharedValue(1);
  const scale2 = useSharedValue(1);
  const scale3 = useSharedValue(1);
  const opacity1 = useSharedValue(0.3);
  const opacity2 = useSharedValue(0.2);
  const opacity3 = useSharedValue(0.1);

  useEffect(() => {
    if (isRecording) {
      // Animate each ring with different delays
      const animateRing = (
        scale: Animated.SharedValue<number>,
        opacity: Animated.SharedValue<number>,
        delay: number
      ) => {
        scale.value = withDelay(
          delay,
          withRepeat(
            withTiming(1.8, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1,
            false
          )
        );
        opacity.value = withDelay(
          delay,
          withRepeat(
            withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
            -1,
            false
          )
        );
      };

      animateRing(scale1, opacity1, 0);
      animateRing(scale2, opacity2, 500);
      animateRing(scale3, opacity3, 1000);
    } else {
      // Reset to idle
      scale1.value = withSpring(1, animation.spring.gentle);
      scale2.value = withSpring(1, animation.spring.gentle);
      scale3.value = withSpring(1, animation.spring.gentle);
      opacity1.value = withTiming(0.3, { duration: 300 });
      opacity2.value = withTiming(0.2, { duration: 300 });
      opacity3.value = withTiming(0.1, { duration: 300 });
    }
  }, [isRecording]);

  const ringStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: scale1.value }],
    opacity: opacity1.value,
  }));

  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: scale2.value }],
    opacity: opacity2.value,
  }));

  const ringStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: scale3.value }],
    opacity: opacity3.value,
  }));

  return (
    <View style={[circularStyles.container, { width: size * 2, height: size * 2 }]}>
      <Animated.View
        style={[
          circularStyles.ring,
          { width: size, height: size, borderColor: color },
          ringStyle3,
        ]}
      />
      <Animated.View
        style={[
          circularStyles.ring,
          { width: size, height: size, borderColor: color },
          ringStyle2,
        ]}
      />
      <Animated.View
        style={[
          circularStyles.ring,
          { width: size, height: size, borderColor: color },
          ringStyle1,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
  },
});

const circularStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 9999,
  },
});

export default VoiceWaveform;
