/**
 * Settings Screen - Premium settings interface
 *
 * Features:
 * - Animated section cards
 * - Premium input styling
 * - Toggle switches with haptic feedback
 * - Sound settings control
 * - Clean, modern design
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  StatusBar,
} from 'react-native';
import Animated, {
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Theme
import { colors, typography, spacing, borderRadius, shadows, layout } from '../../theme';

// Components
import AnimatedPressable from '../../components/ui/AnimatedPressable';
import PremiumButton from '../../components/ui/PremiumButton';

// Services
import { supabase } from '../../config/supabase';
import soundService from '../../services/soundService';

export default function SettingsScreen() {
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    loadUserData();
    loadSoundPreference();
  }, []);

  const loadUserData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (prefs?.location_city) {
          setCity(prefs.location_city);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadSoundPreference = async () => {
    await soundService.initialize();
    setSoundEnabled(soundService.getEnabled());
  };

  const handleSaveLocation = async () => {
    if (!city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return;
    }

    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        return;
      }

      const { error } = await supabase.from('user_preferences').upsert({
        user_id: user.id,
        location_city: city,
        location_lat: 0,
        location_lng: 0,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await soundService.playSuccess();
      Alert.alert('Success', 'Location saved successfully');
    } catch (error) {
      console.error('Failed to save location:', error);
      Alert.alert('Error', 'Failed to save location');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSound = async (value: boolean) => {
    setSoundEnabled(value);
    await soundService.setEnabled(value);
    if (value) {
      await soundService.playSuccess();
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await supabase.auth.signOut();
            Alert.alert('Success', 'Signed out successfully');
          } catch (error) {
            console.error('Failed to sign out:', error);
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
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
        <Animated.View entering={FadeInDown.duration(500)}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>Customize your experience</Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Account Section */}
        {user && (
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.section}
          >
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={[styles.card, shadows.md]}>
              <View style={styles.accountRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={colors.gradients.primary as [string, string]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {user.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountEmail}>{user.email}</Text>
                  <Text style={styles.accountLabel}>Signed in</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Location Section */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={[styles.card, shadows.md]}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your City</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city (e.g., San Francisco)"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
            </View>

            <PremiumButton
              onPress={handleSaveLocation}
              loading={loading}
              fullWidth
              icon={
                !loading ? (
                  <Ionicons
                    name="checkmark"
                    size={18}
                    color={colors.neutral[0]}
                  />
                ) : undefined
              }
            >
              Save Location
            </PremiumButton>

            <Text style={styles.hint}>
              We use your location to find nearby activities and places for your
              weekend plans.
            </Text>
          </View>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={[styles.card, shadows.md]}>
            <SettingsRow
              icon="volume-high-outline"
              title="Sound Effects"
              description="Play sounds for actions and notifications"
              trailing={
                <Switch
                  value={soundEnabled}
                  onValueChange={handleToggleSound}
                  trackColor={{
                    false: colors.neutral[200],
                    true: colors.primary[400],
                  }}
                  thumbColor={colors.neutral[0]}
                />
              }
            />

            <View style={styles.divider} />

            <SettingsRow
              icon="notifications-outline"
              title="Notifications"
              description="Get reminded about your plans"
              trailing={
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.neutral[400]}
                />
              }
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Coming Soon', 'Notification settings will be available in a future update.');
              }}
            />
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View
          entering={FadeInDown.delay(400).springify()}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>About</Text>
          <View style={[styles.card, shadows.md]}>
            <SettingsRow
              icon="information-circle-outline"
              title="App Version"
              trailing={<Text style={styles.versionText}>1.0.0</Text>}
            />

            <View style={styles.divider} />

            <SettingsRow
              icon="construct-outline"
              title="Build"
              trailing={<Text style={styles.versionText}>Development</Text>}
            />

            <View style={styles.divider} />

            <SettingsRow
              icon="heart-outline"
              title="Made with"
              trailing={
                <View style={styles.madeWithRow}>
                  <Text style={styles.madeWithText}>React Native + Expo</Text>
                </View>
              }
            />
          </View>
        </Animated.View>

        {/* Sign Out */}
        {user && (
          <Animated.View
            entering={FadeInDown.delay(500).springify()}
            style={styles.section}
          >
            <PremiumButton
              onPress={handleSignOut}
              variant="danger"
              fullWidth
              icon={
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={colors.neutral[0]}
                />
              }
            >
              Sign Out
            </PremiumButton>
          </Animated.View>
        )}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// Settings Row Component
function SettingsRow({
  icon,
  title,
  description,
  trailing,
  onPress,
}: {
  icon: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowIcon}>
        <Ionicons name={icon as any} size={22} color={colors.primary[500]} />
      </View>
      <View style={styles.settingsRowContent}>
        <Text style={styles.settingsRowTitle}>{title}</Text>
        {description && (
          <Text style={styles.settingsRowDescription}>{description}</Text>
        )}
      </View>
      {trailing}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} hapticType="light" scaleIntensity="subtle">
        {content}
      </AnimatedPressable>
    );
  }

  return content;
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
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
    marginBottom: spacing[1],
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[5],
  },
  section: {
    marginBottom: spacing[5],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    marginLeft: spacing[1],
  },
  card: {
    backgroundColor: colors.neutral[0],
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing[4],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.neutral[0],
  },
  accountInfo: {
    flex: 1,
  },
  accountEmail: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    marginBottom: spacing[1],
  },
  accountLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  inputGroup: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
    marginBottom: spacing[2],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    paddingHorizontal: spacing[3],
  },
  inputIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    color: colors.neutral[900],
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    marginTop: spacing[3],
    lineHeight: typography.fontSize.xs * typography.lineHeight.relaxed,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  settingsRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  settingsRowContent: {
    flex: 1,
  },
  settingsRowTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[900],
  },
  settingsRowDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[100],
    marginVertical: spacing[3],
  },
  versionText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  madeWithRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  madeWithText: {
    fontSize: typography.fontSize.sm,
    color: colors.neutral[500],
  },
  bottomSpacer: {
    height: spacing[10],
  },
});
