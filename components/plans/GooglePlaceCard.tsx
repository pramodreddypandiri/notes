import React from 'react';
import { StyleSheet, View, Text, Linking, Platform } from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedPressable from '../ui/AnimatedPressable';
import { colors, typography, spacing, borderRadius, shadows, getThemedColors } from '../../theme';
import { useTheme } from '../../context/ThemeContext';
import { GooglePlaceResult, formatPriceLevel, markPlaceNavigated } from '../../services/googlePlacesService';

interface GooglePlaceCardProps {
  place: GooglePlaceResult & { noteContext?: string };
  index: number;
  onDismiss: (resultId: string) => void;
}

export function GooglePlaceCard({ place, index, onDismiss }: GooglePlaceCardProps) {
  const { isDark } = useTheme();
  const themedColors = getThemedColors(isDark);

  const handleNavigate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    markPlaceNavigated(place.id).catch(() => {});

    if (Platform.OS === 'ios') {
      Linking.openURL(
        `maps://?daddr=${place.latitude},${place.longitude}&q=${encodeURIComponent(place.name)}`
      );
    } else {
      Linking.openURL(
        place.googleMapsUri ||
        `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`
      );
    }
  };

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss(place.id);
  };

  const priceDisplay = formatPriceLevel(place.priceLevel);

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).springify().damping(15)}
      layout={Layout.springify()}
      style={[
        styles.card,
        shadows.md,
        { backgroundColor: themedColors.surface.primary },
      ]}
    >
      {/* Header: Note context + dismiss */}
      <View style={styles.header}>
        {place.noteContext ? (
          <View style={[styles.noteContextBadge, { backgroundColor: isDark ? colors.accent.amber.dark + '20' : colors.accent.amber.light }]}>
            <Ionicons name="document-text" size={12} color={colors.accent.amber.base} />
            <Text
              style={[styles.noteContextText, { color: isDark ? colors.accent.amber.light : colors.accent.amber.dark }]}
              numberOfLines={1}
            >
              {place.noteContext}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <AnimatedPressable onPress={handleDismiss} style={styles.dismissButton} hapticType="light">
          <Ionicons name="close" size={18} color={themedColors.text.muted} />
        </AnimatedPressable>
      </View>

      {/* Place name */}
      <Text style={[styles.placeName, { color: themedColors.text.primary }]}>
        {place.name}
      </Text>

      {/* Rating + Price row */}
      <View style={styles.ratingRow}>
        {place.rating != null && (
          <View style={styles.ratingContainer}>
            <StarRating rating={place.rating} />
            <Text style={[styles.ratingText, { color: themedColors.text.secondary }]}>
              {place.rating.toFixed(1)}
            </Text>
            {place.userRatingCount > 0 && (
              <Text style={[styles.ratingCount, { color: themedColors.text.tertiary }]}>
                ({place.userRatingCount.toLocaleString()})
              </Text>
            )}
          </View>
        )}
        {priceDisplay ? (
          <Text style={[styles.priceText, { color: themedColors.text.secondary }]}>
            {priceDisplay}
          </Text>
        ) : null}
      </View>

      {/* Address */}
      {place.address ? (
        <View style={styles.addressRow}>
          <Ionicons name="location-outline" size={14} color={themedColors.text.tertiary} />
          <Text style={[styles.addressText, { color: themedColors.text.tertiary }]} numberOfLines={2}>
            {place.address}
          </Text>
        </View>
      ) : null}

      {/* Navigate CTA */}
      <AnimatedPressable onPress={handleNavigate} hapticType="medium">
        <LinearGradient
          colors={colors.gradients.primary as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.navigateButton}
        >
          <Ionicons name="navigate-outline" size={18} color={colors.neutral[0]} />
          <Text style={styles.navigateText}>Navigate</Text>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

// Star rating component
function StarRating({ rating }: { rating: number }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#F59E0B" />);
    } else if (rating >= i - 0.5) {
      stars.push(<Ionicons key={i} name="star-half" size={14} color="#F59E0B" />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={14} color="#D1D5DB" />);
    }
  }
  return <View style={styles.starsContainer}>{stars}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  noteContextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    flex: 1,
    marginRight: spacing[2],
  },
  noteContextText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[2],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  ratingCount: {
    fontSize: typography.fontSize.xs,
  },
  priceText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  addressText: {
    fontSize: typography.fontSize.sm,
    flex: 1,
    lineHeight: typography.fontSize.sm * 1.4,
  },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  navigateText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[0],
  },
});

export default GooglePlaceCard;
