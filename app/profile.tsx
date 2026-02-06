/**
 * Profile/ Settings Screen - Combined settings and profile management
 *
 * Features:
 * - User account info
 * - Personalization settings
 * - App settings (notifications, theme, sound)
 * - Location settings
 * - About section
 * - Sign out
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
  Modal,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Theme
import { colors, typography, spacing, borderRadius, shadows, getThemedColors } from '../theme';

// Components
import AnimatedPressable from '../components/ui/AnimatedPressable';
import PremiumButton from '../components/ui/PremiumButton';

// Services
import { supabase } from '../config/supabase';
import soundService from '../services/soundService';
import { getUserProfile, UserProfile } from '../services/profileService';
import authService from '../services/authService';
import preferencesService, { UserPreferences, NotificationTone } from '../services/preferencesService';

// Context
import { useTheme } from '../context/ThemeContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);

  // Account management state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  // Check if user signed in with email/password (not OAuth)
  const isEmailUser = user?.app_metadata?.provider === 'email' ||
    user?.identities?.some((identity: any) => identity.provider === 'email');

  // Preferences state
  const [wakeTime, setWakeTime] = useState('07:00');
  const [sleepTime, setSleepTime] = useState('22:00');
  const [notificationTone, setNotificationTone] = useState<NotificationTone>('friendly');

  // Theme
  const { isDark, themeMode, setThemeMode } = useTheme();
  const themedColors = getThemedColors(isDark);

  useEffect(() => {
    loadUserData();
    loadSoundPreference();
    loadProfile();
    loadPreferences();
  }, []);

  const loadProfile = async () => {
    try {
      const userProfile = await getUserProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await preferencesService.getPreferences();
      if (prefs) {
        setPreferences(prefs);
        setWakeTime(prefs.wake_time);
        setSleepTime(prefs.sleep_time);
        setNotificationTone(prefs.notification_tone);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setAccountLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await authService.changePassword(newPassword);

    setAccountLoading(false);

    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } else {
      Alert.alert('Error', result.error || 'Failed to change password');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            const result = await authService.deleteAccount();
            if (result.success) {
              Alert.alert('Account Deleted', 'Your account and all data have been deleted.');
            } else {
              Alert.alert('Error', result.error || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  const handleUpdatePreference = async (key: string, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const updates = { [key]: value };
    const result = await preferencesService.updatePreferences(updates);

    if (result) {
      setPreferences(result);
      if (key === 'wake_time') setWakeTime(value);
      if (key === 'sleep_time') setSleepTime(value);
      if (key === 'notification_tone') setNotificationTone(value);
    }
  };

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

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background.primary }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing[2] }]}>
        <AnimatedPressable
          onPress={handleBack}
          style={[styles.backButton, { backgroundColor: themedColors.surface.secondary }]}
          hapticType="light"
        >
          <Ionicons name="chevron-back" size={24} color={themedColors.text.primary} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: themedColors.text.primary }]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

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
            <Text style={[styles.sectionTitle, { color: themedColors.text.tertiary }]}>Account</Text>
            <View style={[styles.card, shadows.md, { backgroundColor: themedColors.surface.primary }]}>
              <View style={styles.accountRow}>
                <View style={styles.avatarContainer}>
                  <LinearGradient
                    colors={colors.gradients.primary as [string, string]}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {user.user_metadata?.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </Text>
                  </LinearGradient>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountEmail, { color: themedColors.text.primary }]}>
                    {user.user_metadata?.full_name || user.email}
                  </Text>
                  <Text style={[styles.accountLabel, { color: themedColors.text.tertiary }]}>{user.email}</Text>
                </View>
              </View>

              {/* Only show password change for email/password users, not OAuth */}
              {isEmailUser && (
                <>
                  <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

                  <SettingsRow
                    icon="lock-closed-outline"
                    title="Change Password"
                    description="Update your password"
                    themedColors={themedColors}
                    trailing={
                      <Ionicons name="chevron-forward" size={20} color={themedColors.text.muted} />
                    }
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setShowPasswordModal(true);
                    }}
                  />
                </>
              )}

              <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

              <SettingsRow
                icon="trash-outline"
                title="Delete Account"
                description="Permanently delete your account"
                themedColors={themedColors}
                trailing={
                  <Ionicons name="chevron-forward" size={20} color={colors.semantic.error} />
                }
                onPress={handleDeleteAccount}
              />
            </View>
          </Animated.View>
        )}

        {/* Personalization Section */}
        <Animated.View
          entering={FadeInDown.delay(150).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themedColors.text.tertiary }]}>Personalization</Text>
          <View style={[styles.card, shadows.md, { backgroundColor: themedColors.surface.primary }]}>
            {profile?.onboarding_completed ? (
              <>
                <View style={styles.profileSummary}>
                  <View style={styles.profileSummaryRow}>
                    <Text style={[styles.profileLabel, { color: themedColors.text.primary }]}>Personality Profile</Text>
                    <View style={styles.profileBadge}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.semantic.success} />
                      <Text style={styles.profileBadgeText}>Complete</Text>
                    </View>
                  </View>
                  <Text style={[styles.profileHint, { color: themedColors.text.tertiary }]}>
                    Your preferences help us create better plans for you.
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />
                <SettingsRow
                  icon="refresh-outline"
                  title="Retake Personality Quiz"
                  description="Update your preferences"
                  themedColors={themedColors}
                  trailing={
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={themedColors.text.muted}
                    />
                  }
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/onboarding' as any);
                  }}
                />
              </>
            ) : (
              <>
                <View style={styles.profileSummary}>
                  <Text style={[styles.profileLabel, { color: themedColors.text.primary }]}>Get Personalized Plans</Text>
                  <Text style={[styles.profileHint, { color: themedColors.text.tertiary }]}>
                    Take a quick quiz so we can tailor recommendations to your personality and preferences.
                  </Text>
                </View>
                <PremiumButton
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/onboarding' as any);
                  }}
                  gradient
                  fullWidth
                  icon={
                    <Ionicons
                      name="sparkles"
                      size={18}
                      color={colors.neutral[0]}
                    />
                  }
                >
                  Take the Quiz
                </PremiumButton>
              </>
            )}
          </View>
        </Animated.View>

        {/* Location Section */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themedColors.text.tertiary }]}>Location</Text>
          <View style={[styles.card, shadows.md, { backgroundColor: themedColors.surface.primary }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: themedColors.text.secondary }]}>Your City</Text>
              <View style={[styles.inputContainer, { backgroundColor: themedColors.input.background, borderColor: themedColors.input.border }]}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={themedColors.input.placeholder}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: themedColors.text.primary }]}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city (e.g., San Francisco)"
                  placeholderTextColor={themedColors.input.placeholder}
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

            <Text style={[styles.hint, { color: themedColors.text.tertiary }]}>
              We use your location to find nearby activities and places for your
              weekend plans.
            </Text>
          </View>
        </Animated.View>

        {/* User Preferences Section */}
        <Animated.View
          entering={FadeInDown.delay(250).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themedColors.text.tertiary }]}>Preferences</Text>
          <View style={[styles.card, shadows.md, { backgroundColor: themedColors.surface.primary }]}>
            <SettingsRow
              icon="sunny-outline"
              title="Wake Time"
              description="When your day starts"
              themedColors={themedColors}
              trailing={
                <View style={styles.timeSelector}>
                  {['06:00', '07:00', '08:00', '09:00'].map((time) => (
                    <AnimatedPressable
                      key={time}
                      onPress={() => handleUpdatePreference('wake_time', time)}
                      style={[
                        styles.timeOption,
                        wakeTime === time && styles.timeOptionActive,
                        { borderColor: wakeTime === time ? colors.primary[500] : themedColors.surface.border },
                      ]}
                      hapticType="light"
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          { color: wakeTime === time ? colors.primary[500] : themedColors.text.tertiary },
                        ]}
                      >
                        {time.replace(':00', '')}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              }
            />

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <SettingsRow
              icon="moon-outline"
              title="Sleep Time"
              description="When your day ends"
              themedColors={themedColors}
              trailing={
                <View style={styles.timeSelector}>
                  {['21:00', '22:00', '23:00', '00:00'].map((time) => (
                    <AnimatedPressable
                      key={time}
                      onPress={() => handleUpdatePreference('sleep_time', time)}
                      style={[
                        styles.timeOption,
                        sleepTime === time && styles.timeOptionActive,
                        { borderColor: sleepTime === time ? colors.primary[500] : themedColors.surface.border },
                      ]}
                      hapticType="light"
                    >
                      <Text
                        style={[
                          styles.timeOptionText,
                          { color: sleepTime === time ? colors.primary[500] : themedColors.text.tertiary },
                        ]}
                      >
                        {time === '00:00' ? '12' : time.replace(':00', '')}
                      </Text>
                    </AnimatedPressable>
                  ))}
                </View>
              }
            />

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <View style={styles.toneSection}>
              <View style={styles.toneLabelRow}>
                <View style={styles.settingsRowIcon}>
                  <Ionicons name="chatbubble-outline" size={22} color={colors.primary[500]} />
                </View>
                <View style={styles.settingsRowContent}>
                  <Text style={[styles.settingsRowTitle, { color: themedColors.text.primary }]}>Notification Tone</Text>
                  <Text style={[styles.settingsRowDescription, { color: themedColors.text.tertiary }]}>
                    How reminders sound
                  </Text>
                </View>
              </View>
              <View style={styles.toneOptions}>
                {([
                  { value: 'friendly', label: 'Friendly', icon: 'happy-outline' },
                  { value: 'neutral', label: 'Neutral', icon: 'remove-outline' },
                  { value: 'motivational', label: 'Motivational', icon: 'flame-outline' },
                ] as const).map((tone) => (
                  <AnimatedPressable
                    key={tone.value}
                    onPress={() => handleUpdatePreference('notification_tone', tone.value)}
                    style={[
                      styles.toneOption,
                      notificationTone === tone.value && styles.toneOptionActive,
                      {
                        borderColor: notificationTone === tone.value ? colors.primary[500] : themedColors.surface.border,
                        backgroundColor: notificationTone === tone.value ? colors.primary[50] : 'transparent',
                      },
                    ]}
                    hapticType="light"
                  >
                    <Ionicons
                      name={tone.icon as any}
                      size={20}
                      color={notificationTone === tone.value ? colors.primary[500] : themedColors.text.tertiary}
                    />
                    <Text
                      style={[
                        styles.toneOptionText,
                        { color: notificationTone === tone.value ? colors.primary[500] : themedColors.text.secondary },
                      ]}
                    >
                      {tone.label}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </View>
          </View>
        </Animated.View>

        {/* App Settings Section */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themedColors.text.tertiary }]}>App Settings</Text>
          <View style={[styles.card, shadows.md, { backgroundColor: themedColors.surface.primary }]}>
            <SettingsRow
              icon="notifications-outline"
              title="Notifications"
              description="Get reminded about your plans"
              themedColors={themedColors}
              trailing={
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={themedColors.text.muted}
                />
              }
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert('Coming Soon', 'Notification settings will be available in a future update.');
              }}
            />

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <SettingsRow
              icon="moon-outline"
              title="Theme"
              description={themeMode === 'system' ? 'Following system setting' : isDark ? 'Dark theme' : 'Light theme'}
              themedColors={themedColors}
              trailing={
                <View style={styles.themeSwitcher}>
                  {(['light', 'dark', 'system'] as const).map((mode) => (
                    <AnimatedPressable
                      key={mode}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setThemeMode(mode);
                      }}
                      style={[
                        styles.themeOption,
                        themeMode === mode && styles.themeOptionActive,
                        { borderColor: themeMode === mode ? colors.primary[500] : themedColors.surface.border },
                      ]}
                      hapticType="light"
                    >
                      <Ionicons
                        name={mode === 'light' ? 'sunny' : mode === 'dark' ? 'moon' : 'phone-portrait-outline'}
                        size={16}
                        color={themeMode === mode ? colors.primary[500] : themedColors.text.tertiary}
                      />
                    </AnimatedPressable>
                  ))}
                </View>
              }
            />

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <SettingsRow
              icon="volume-high-outline"
              title="Sound Effects"
              description="Play sounds for actions"
              themedColors={themedColors}
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

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <SettingsRow
              icon="location-outline"
              title="Location Reminders"
              description="Get notified at the right place"
              themedColors={themedColors}
              trailing={
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={themedColors.text.muted}
                />
              }
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/locations' as any);
              }}
            />
          </View>
        </Animated.View>

        {/* About Section */}
        <Animated.View
          entering={FadeInDown.delay(300).springify()}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, { color: themedColors.text.tertiary }]}>About</Text>
          <View style={[styles.card, shadows.md, { backgroundColor: themedColors.surface.primary }]}>
            <SettingsRow
              icon="information-circle-outline"
              title="App Version"
              themedColors={themedColors}
              trailing={<Text style={[styles.versionText, { color: themedColors.text.tertiary }]}>1.0.0</Text>}
            />

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <SettingsRow
              icon="construct-outline"
              title="Build"
              themedColors={themedColors}
              trailing={<Text style={[styles.versionText, { color: themedColors.text.tertiary }]}>Development</Text>}
            />

            <View style={[styles.divider, { backgroundColor: themedColors.surface.border }]} />

            <SettingsRow
              icon="heart-outline"
              title="Made with"
              themedColors={themedColors}
              trailing={
                <View style={styles.madeWithRow}>
                  <Text style={[styles.madeWithText, { color: themedColors.text.tertiary }]}>React Native + Expo</Text>
                </View>
              }
            />
          </View>
        </Animated.View>

        {/* Sign Out */}
        {user && (
          <Animated.View
            entering={FadeInDown.delay(350).springify()}
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
        <View style={[styles.bottomSpacer, { paddingBottom: insets.bottom }]} />
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowPasswordModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              >
                <View style={[styles.modalContent, { backgroundColor: themedColors.surface.primary }]}>
                  <Text style={[styles.modalTitle, { color: themedColors.text.primary }]}>
                    Change Password
                  </Text>

                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: themedColors.input.background,
                        borderColor: themedColors.input.border,
                        color: themedColors.text.primary,
                      },
                    ]}
                    placeholder="New password"
                    placeholderTextColor={themedColors.input.placeholder}
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />

                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: themedColors.input.background,
                        borderColor: themedColors.input.border,
                        color: themedColors.text.primary,
                      },
                    ]}
                    placeholder="Confirm password"
                    placeholderTextColor={themedColors.input.placeholder}
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />

                  <View style={styles.modalButtons}>
                    <View style={styles.modalButton}>
                      <PremiumButton
                        onPress={() => {
                          setShowPasswordModal(false);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        variant="secondary"
                        fullWidth
                      >
                        Cancel
                      </PremiumButton>
                    </View>
                    <View style={styles.modalButton}>
                      <PremiumButton
                        onPress={handleChangePassword}
                        loading={accountLoading}
                        fullWidth
                      >
                        Save
                      </PremiumButton>
                    </View>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  themedColors,
}: {
  icon: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  themedColors: ReturnType<typeof getThemedColors>;
}) {
  const content = (
    <View style={styles.settingsRow}>
      <View style={styles.settingsRowIcon}>
        <Ionicons name={icon as any} size={22} color={colors.primary[500]} />
      </View>
      <View style={styles.settingsRowContent}>
        <Text style={[styles.settingsRowTitle, { color: themedColors.text.primary }]}>{title}</Text>
        {description && (
          <Text style={[styles.settingsRowDescription, { color: themedColors.text.tertiary }]}>{description}</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  headerRight: {
    width: 40,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    marginLeft: spacing[1],
  },
  card: {
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
    marginBottom: spacing[1],
  },
  accountLabel: {
    fontSize: typography.fontSize.sm,
  },
  inputGroup: {
    marginBottom: spacing[4],
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    marginBottom: spacing[2],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[3],
  },
  inputIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
  },
  hint: {
    fontSize: typography.fontSize.xs,
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
  },
  settingsRowDescription: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing[1],
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  versionText: {
    fontSize: typography.fontSize.sm,
  },
  madeWithRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  madeWithText: {
    fontSize: typography.fontSize.sm,
  },
  bottomSpacer: {
    height: spacing[10],
  },
  profileSummary: {
    marginBottom: spacing[3],
  },
  profileSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  profileLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent.emerald.light,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  profileBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.accent.emerald.dark,
  },
  profileHint: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  themeSwitcher: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  themeOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  themeOptionActive: {
    backgroundColor: colors.primary[50],
  },
  timeSelector: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  timeOption: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minWidth: 36,
    alignItems: 'center',
  },
  timeOptionActive: {
    backgroundColor: colors.primary[50],
  },
  timeOptionText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  toneSection: {
    paddingVertical: spacing[2],
  },
  toneLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  toneOptions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginLeft: 52,
  },
  toneOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  toneOptionActive: {
    borderWidth: 1.5,
  },
  toneOptionText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[5],
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing[5],
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  modalInput: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.base,
    marginBottom: spacing[3],
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  modalButton: {
    flex: 1,
  },
});
