/**
 * Plans Screen - Place suggestions with Like/Dislike feedback
 *
 * Features:
 * - Two sections: Going (liked places) and Suggestions
 * - Like/Dislike feedback for learning user preferences
 * - Pull-to-refresh for new suggestions
 * - AI-powered personalized suggestions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Alert,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Theme
import { colors, typography, spacing, shadows, getThemedColors } from '../../theme';

// Context
import { useTheme } from '../../context/ThemeContext';

// Components
import PremiumButton from '../../components/ui/PremiumButton';
import { PlaceCard } from '../../components/plans/PlaceCard';
import { GooglePlaceCard } from '../../components/plans/GooglePlaceCard';
import { PlanGenerationLoader } from '../../components/plans/PlanGenerationLoader';
import TopBar from '../../components/common/TopBar';

// Services
import {
  createPlaceSuggestions,
  getSuggestions,
  getLikedPlaces,
  updateSuggestionStatus,
  removeLikedPlace,
  StoredPlaceSuggestion,
} from '../../services/plansService';
import {
  getAllNotePlaces,
  dismissNotePlaceResult,
  NotePlaceGroup,
  GooglePlaceResult,
} from '../../services/googlePlacesService';
import { supabase } from '../../config/supabase';
import soundService from '../../services/soundService';

export default function PlansScreen() {
  const { isDark } = useTheme();
  const themedColors = getThemedColors(isDark);

  const [suggestions, setSuggestions] = useState<StoredPlaceSuggestion[]>([]);
  const [likedPlaces, setLikedPlaces] = useState<StoredPlaceSuggestion[]>([]);
  const [notePlaces, setNotePlaces] = useState<NotePlaceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'going' | 'suggestions'>('going');

  // Load existing suggestions and liked places on mount
  useEffect(() => {
    loadPlaces();
  }, []);

  const loadPlaces = async () => {
    try {
      const [suggestionsData, likedData, notePlacesData] = await Promise.all([
        getSuggestions(),
        getLikedPlaces(),
        getAllNotePlaces(),
      ]);
      setSuggestions(suggestionsData);
      setLikedPlaces(likedData);
      setNotePlaces(notePlacesData);
    } catch (error) {
      console.error('Failed to load places:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleGenerateSuggestions = async () => {
    setShowGenerator(true);
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Get user location from preferences
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (!prefs?.location_city) {
        Alert.alert(
          'Location Required',
          'Please set your location in Settings first'
        );
        setShowGenerator(false);
        setLoading(false);
        return;
      }

      const userLocation = {
        lat: prefs.location_lat,
        lng: prefs.location_lng,
        city: prefs.location_city,
      };

      const newSuggestions = await createPlaceSuggestions(userLocation);
      setSuggestions(prev => [...newSuggestions, ...prev]);
      await soundService.playPlanReady();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      await soundService.playError();
      Alert.alert('Error', 'Failed to generate suggestions. Please try again.');
    } finally {
      setShowGenerator(false);
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await loadPlaces();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleLike = async (id: string) => {
    try {
      const updated = await updateSuggestionStatus(id, 'liked');
      // Move from suggestions to liked
      setSuggestions(prev => prev.filter(s => s.id !== id));
      setLikedPlaces(prev => [updated, ...prev]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to like place:', error);
    }
  };

  const handleDislike = async (id: string) => {
    try {
      await updateSuggestionStatus(id, 'disliked');
      // Remove from suggestions
      setSuggestions(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to dislike place:', error);
    }
  };

  const handleRemoveLiked = async (id: string) => {
    try {
      await removeLikedPlace(id);
      setLikedPlaces(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to remove liked place:', error);
    }
  };

  const handleDismissPlace = async (resultId: string) => {
    try {
      await dismissNotePlaceResult(resultId);
      setNotePlaces(prev =>
        prev
          .map(np => ({
            ...np,
            places: np.places.filter(p => p.id !== resultId),
          }))
          .filter(np => np.places.length > 0)
      );
    } catch (error) {
      console.error('Failed to dismiss place:', error);
    }
  };

  // Flatten note places into a single array with note context
  const notePlacesFlat = notePlaces.flatMap(np =>
    np.places.map(p => ({ ...p, noteContext: np.noteSummary || np.noteTranscript }))
  );

  const isEmpty = likedPlaces.length === 0 && suggestions.length === 0 && notePlacesFlat.length === 0;

  // Build data for the Suggestions tab: note places + AI suggestions
  const suggestionsTabData: { type: 'note_places' | 'suggestion'; item: any }[] = [
    ...notePlacesFlat.map(p => ({ type: 'note_places' as const, item: p })),
    ...suggestions.map(s => ({ type: 'suggestion' as const, item: s })),
  ];

  const handleTabSwitch = (tab: 'going' | 'suggestions') => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Bar */}
      <TopBar themedColors={themedColors} />

      {/* Page Title */}
      <View style={styles.pageTitleContainer}>
        <Text style={[styles.pageTitle, { color: themedColors.text.primary }]}>Places</Text>
        <Text style={[styles.pageSubtitle, { color: themedColors.text.tertiary }]}>
          {likedPlaces.length > 0
            ? `${likedPlaces.length} place${likedPlaces.length > 1 ? 's' : ''} to visit`
            : 'Discover places made for you'}
        </Text>
      </View>

      {/* Content */}
      {showGenerator ? (
        <PlanGenerationLoader
          isLoading={loading}
          onComplete={() => setShowGenerator(false)}
        />
      ) : initialLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: themedColors.text.tertiary }]}>
            Loading...
          </Text>
        </View>
      ) : isEmpty ? (
        <EmptyState onGenerate={handleGenerateSuggestions} loading={loading} themedColors={themedColors} />
      ) : (
        <>
          {/* Tab Bar */}
          <View style={[styles.tabBar, { borderBottomColor: themedColors.surface.border }]}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'going' && styles.tabActive,
                activeTab === 'going' && { borderBottomColor: colors.accent.emerald.base },
              ]}
              onPress={() => handleTabSwitch('going')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="heart"
                size={16}
                color={activeTab === 'going' ? colors.accent.emerald.base : themedColors.text.tertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'going' ? themedColors.text.primary : themedColors.text.tertiary },
                  activeTab === 'going' && styles.tabTextActive,
                ]}
              >
                Going
              </Text>
              {likedPlaces.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: activeTab === 'going' ? colors.accent.emerald.base : themedColors.surface.secondary }]}>
                  <Text style={[styles.tabBadgeText, { color: activeTab === 'going' ? colors.neutral[0] : themedColors.text.secondary }]}>
                    {likedPlaces.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'suggestions' && styles.tabActive,
                activeTab === 'suggestions' && { borderBottomColor: colors.primary[500] },
              ]}
              onPress={() => handleTabSwitch('suggestions')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="sparkles"
                size={16}
                color={activeTab === 'suggestions' ? colors.primary[500] : themedColors.text.tertiary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'suggestions' ? themedColors.text.primary : themedColors.text.tertiary },
                  activeTab === 'suggestions' && styles.tabTextActive,
                ]}
              >
                Suggestions
              </Text>
              {suggestionsTabData.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: activeTab === 'suggestions' ? colors.primary[500] : themedColors.surface.secondary }]}>
                  <Text style={[styles.tabBadgeText, { color: activeTab === 'suggestions' ? colors.neutral[0] : themedColors.text.secondary }]}>
                    {suggestionsTabData.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'going' ? (
            <FlatList
              data={likedPlaces}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <PlaceCard
                  place={item}
                  index={index}
                  onLike={handleLike}
                  onDislike={handleDislike}
                  variant="going"
                  onRemove={handleRemoveLiked}
                />
              )}
              contentContainerStyle={[
                styles.listContent,
                likedPlaces.length === 0 && styles.emptyTabContent,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary[500]}
                  colors={[colors.primary[500]]}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyTab}>
                  <Ionicons name="heart-outline" size={48} color={themedColors.text.tertiary} />
                  <Text style={[styles.emptyTabTitle, { color: themedColors.text.secondary }]}>
                    No places yet
                  </Text>
                  <Text style={[styles.emptyTabText, { color: themedColors.text.tertiary }]}>
                    Like suggestions to add them here
                  </Text>
                </View>
              }
            />
          ) : (
            <FlatList
              data={suggestionsTabData}
              keyExtractor={(entry, index) => entry.item.id || `${index}`}
              renderItem={({ item: entry, index }) => {
                if (entry.type === 'note_places') {
                  return (
                    <GooglePlaceCard
                      place={entry.item}
                      index={index}
                      onDismiss={handleDismissPlace}
                    />
                  );
                }
                return (
                  <PlaceCard
                    place={entry.item}
                    index={index}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    variant="suggestion"
                  />
                );
              }}
              contentContainerStyle={[
                styles.listContent,
                suggestionsTabData.length === 0 && styles.emptyTabContent,
              ]}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={colors.primary[500]}
                  colors={[colors.primary[500]]}
                />
              }
              ListFooterComponent={
                <View style={styles.footerContainer}>
                  <PremiumButton
                    onPress={handleGenerateSuggestions}
                    loading={loading}
                    gradient
                    size="md"
                    icon={!loading ? <Ionicons name="sparkles" size={18} color={colors.neutral[0]} /> : undefined}
                  >
                    {suggestions.length > 0 ? 'Get More Suggestions' : 'Get Suggestions'}
                  </PremiumButton>
                </View>
              }
              ListEmptyComponent={
                <View style={styles.emptyTab}>
                  <Ionicons name="sparkles-outline" size={48} color={themedColors.text.tertiary} />
                  <Text style={[styles.emptyTabTitle, { color: themedColors.text.secondary }]}>
                    No suggestions yet
                  </Text>
                  <Text style={[styles.emptyTabText, { color: themedColors.text.tertiary }]}>
                    Tap below to get personalized places
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

// Empty State Component
function EmptyState({
  onGenerate,
  loading,
  themedColors,
}: {
  onGenerate: () => void;
  loading: boolean;
  themedColors: ReturnType<typeof getThemedColors>;
}) {
  return (
    <Animated.View
      entering={FadeIn.delay(300)}
      style={styles.emptyState}
    >
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={colors.gradients.primary as [string, string]}
          style={styles.emptyIconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name="compass" size={48} color={colors.neutral[0]} />
        </LinearGradient>

        {/* Decorative rings */}
        <View style={[styles.decorativeRing, styles.ring1]} />
        <View style={[styles.decorativeRing, styles.ring2]} />
        <View style={[styles.decorativeRing, styles.ring3]} />
      </View>

      <Text style={[styles.emptyTitle, { color: themedColors.text.primary }]}>
        Discover places just for you
      </Text>
      <Text style={[styles.emptyText, { color: themedColors.text.tertiary }]}>
        Get personalized suggestions based on your notes and personality.
        Like places to save them to your Going list.
      </Text>

      <View style={styles.featureList}>
        <FeatureItem
          icon="document-text"
          text="Based on your voice notes"
          themedColors={themedColors}
        />
        <FeatureItem
          icon="person"
          text="Matches your personality"
          themedColors={themedColors}
        />
        <FeatureItem
          icon="heart"
          text="Learns from your feedback"
          themedColors={themedColors}
        />
      </View>

      <PremiumButton
        onPress={onGenerate}
        loading={loading}
        gradient
        size="lg"
        fullWidth
        icon={
          !loading ? (
            <Ionicons name="sparkles" size={20} color={colors.neutral[0]} />
          ) : undefined
        }
      >
        Get Suggestions
      </PremiumButton>
    </Animated.View>
  );
}

// Feature Item Component
function FeatureItem({
  icon,
  text,
  themedColors,
}: {
  icon: string;
  text: string;
  themedColors: ReturnType<typeof getThemedColors>;
}) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: themedColors.primary[50] }]}>
        <Ionicons name={icon as any} size={16} color={colors.primary[500]} />
      </View>
      <Text style={[styles.featureText, { color: themedColors.text.secondary }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageTitleContainer: {
    paddingHorizontal: spacing[5],
    marginBottom: spacing[4],
  },
  pageTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[1],
  },
  pageSubtitle: {
    fontSize: typography.fontSize.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    borderBottomWidth: 1,
    marginBottom: spacing[1],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  tabTextActive: {
    fontWeight: typography.fontWeight.semibold,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[1],
  },
  tabBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  listContent: {
    padding: spacing[5],
    paddingBottom: spacing[20],
  },
  emptyTabContent: {
    flexGrow: 1,
  },
  emptyTab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap: spacing[2],
  },
  emptyTabTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginTop: spacing[2],
  },
  emptyTabText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  footerContainer: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyIconContainer: {
    position: 'relative',
    marginBottom: spacing[6],
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.primary,
  },
  decorativeRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.primary[200],
    borderRadius: 9999,
  },
  ring1: {
    width: 130,
    height: 130,
    top: -15,
    left: -15,
    opacity: 0.5,
  },
  ring2: {
    width: 160,
    height: 160,
    top: -30,
    left: -30,
    opacity: 0.3,
  },
  ring3: {
    width: 190,
    height: 190,
    top: -45,
    left: -45,
    opacity: 0.15,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * 1.5,
    marginBottom: spacing[6],
  },
  featureList: {
    width: '100%',
    marginBottom: spacing[8],
    gap: spacing[3],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: typography.fontSize.base,
  },
});
