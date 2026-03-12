import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from './notificationService';
import { supabase } from '../config/supabase';

// Storage keys
const SAVED_LOCATIONS_KEY = '@saved_locations';
const LOCATION_SETTINGS_KEY = '@location_settings';

// How often to poll location (ms) and minimum distance change (meters)
const WATCH_TIME_INTERVAL = 30_000; // 30 seconds
const WATCH_DISTANCE_INTERVAL = 30;  // 30 meters

// User's personal locations (manually added)
export type LocationType = 'home' | 'work' | 'gym';

export interface SavedLocation {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
  notifyOnEnter: boolean;
  notifyOnExit: boolean;
  createdAt: string;
}

export interface LocationSettings {
  enabled: boolean;
  smartFilteringEnabled: boolean; // Only notify when relevant pending items exist
  leaveHomeReminder: boolean; // "Don't forget!" reminder when leaving home
}

// Note categories that can be triggered by locations
export type NoteCategory =
  | 'shopping'
  | 'grocery'
  | 'pharmacy'
  | 'health'
  | 'errand'
  | 'work'
  | 'fitness'
  | 'leaving_home'
  | 'arriving_home'
  | 'general';

// Mapping of user's personal location types to relevant note categories
const LOCATION_TO_CATEGORIES: Record<LocationType, NoteCategory[]> = {
  home: ['arriving_home'], // Home entry triggers arriving_home notes; exit handled separately
  work: ['work'],
  gym: ['fitness'],
};

// Store chains by category for auto-detection
export const STORE_CHAINS: Record<NoteCategory, string[]> = {
  grocery: [
    'walmart', 'costco', 'kroger', 'target', 'safeway', 'whole foods',
    'trader joe', 'aldi', 'publix', 'wegmans', 'heb', 'meijer',
    'food lion', 'giant', 'stop & shop', 'albertsons', 'vons',
    'ralphs', 'fred meyer', 'winco', 'sprouts', 'market basket',
  ],
  pharmacy: [
    'cvs', 'walgreens', 'rite aid', 'pharmacy', 'drugstore',
    'duane reade', 'kinney drugs',
  ],
  shopping: [
    'mall', 'outlet', 'shopping center', 'department store',
    'best buy', 'home depot', 'lowes', 'ikea', 'bed bath',
  ],
  health: ['hospital', 'clinic', 'doctor', 'medical center', 'urgent care'],
  fitness: ['gym', 'fitness', 'ymca', 'planet fitness', '24 hour fitness', 'la fitness'],
  work: ['office', 'workplace', 'work', 'at work', 'to work', 'the office'],
  errand: ['post office', 'bank', 'dry cleaner', 'auto shop'],
  leaving_home: [],
  arriving_home: [],
  general: [],
};

class LocationService {
  private isInitialized = false;

  // Foreground location watcher subscription
  private locationSubscription: Location.LocationSubscription | null = null;

  // Track which saved-location IDs the user is currently inside
  private insideLocations: Set<string> = new Set();

  /**
   * Initialize the location service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    console.log('[LocationService] Initialized');
  }

  /**
   * Request location permissions (when in use only)
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[LocationService] Foreground permission denied');
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('[LocationService] Permission request error:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted (when in use only)
   */
  async hasPermissions(): Promise<{ foreground: boolean }> {
    const { status } = await Location.getForegroundPermissionsAsync();
    return { foreground: status === 'granted' };
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
    } catch (error) {
      console.error('[LocationService] Get current location error:', error);
      return null;
    }
  }

  /**
   * Save a location
   */
  async saveLocation(location: Omit<SavedLocation, 'id' | 'createdAt'>): Promise<SavedLocation> {
    const newLocation: SavedLocation = {
      ...location,
      id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    const locations = await this.getSavedLocations();
    locations.push(newLocation);
    await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(locations));

    // Restart watcher so it picks up the new location
    await this.updateGeofencing();

    return newLocation;
  }

  /**
   * Get all saved locations
   */
  async getSavedLocations(): Promise<SavedLocation[]> {
    try {
      const data = await AsyncStorage.getItem(SAVED_LOCATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[LocationService] Get saved locations error:', error);
      return [];
    }
  }

  /**
   * Delete a saved location
   */
  async deleteLocation(locationId: string): Promise<void> {
    const locations = await this.getSavedLocations();
    const filtered = locations.filter(loc => loc.id !== locationId);
    await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(filtered));
    this.insideLocations.delete(locationId);
    await this.updateGeofencing();
  }

  /**
   * Update a saved location
   */
  async updateLocation(locationId: string, updates: Partial<SavedLocation>): Promise<void> {
    const locations = await this.getSavedLocations();
    const index = locations.findIndex(loc => loc.id === locationId);
    if (index !== -1) {
      locations[index] = { ...locations[index], ...updates };
      await AsyncStorage.setItem(SAVED_LOCATIONS_KEY, JSON.stringify(locations));
      await this.updateGeofencing();
    }
  }

  /**
   * Get location settings
   */
  async getSettings(): Promise<LocationSettings> {
    try {
      const data = await AsyncStorage.getItem(LOCATION_SETTINGS_KEY);
      return data ? JSON.parse(data) : {
        enabled: false,
        smartFilteringEnabled: true,
        leaveHomeReminder: true,
      };
    } catch (error) {
      return {
        enabled: false,
        smartFilteringEnabled: true,
        leaveHomeReminder: true,
      };
    }
  }

  /**
   * Update location settings
   */
  async updateSettings(settings: Partial<LocationSettings>): Promise<void> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(LOCATION_SETTINGS_KEY, JSON.stringify(updated));

    if (updated.enabled) {
      await this.updateGeofencing();
    } else {
      await this.stopGeofencing();
    }
  }

  /**
   * Start (or restart) the foreground location watcher.
   * Called whenever saved locations or settings change.
   */
  async updateGeofencing(): Promise<void> {
    const settings = await this.getSettings();
    if (!settings.enabled) {
      console.log('[LocationService] Location reminders disabled');
      return;
    }

    const permissions = await this.hasPermissions();
    if (!permissions.foreground) {
      console.warn('[LocationService] Location permission required');
      return;
    }

    const locations = await this.getSavedLocations();
    if (locations.length === 0) {
      console.log('[LocationService] No locations to monitor');
      await this.stopGeofencing();
      return;
    }

    // Stop any existing watcher before starting a new one
    await this.stopGeofencing();

    this.locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: WATCH_TIME_INTERVAL,
        distanceInterval: WATCH_DISTANCE_INTERVAL,
      },
      (position) => this.handlePositionUpdate(position, settings, locations)
    );

    console.log(`[LocationService] Foreground watcher started for ${locations.length} location(s)`);
  }

  /**
   * Stop the foreground location watcher
   */
  async stopGeofencing(): Promise<void> {
    if (this.locationSubscription) {
      this.locationSubscription.remove();
      this.locationSubscription = null;
      this.insideLocations.clear();
      console.log('[LocationService] Foreground watcher stopped');
    }
  }

  /**
   * Called on every position update from the foreground watcher.
   * Detects enter/exit transitions for each saved location.
   */
  private async handlePositionUpdate(
    position: Location.LocationObject,
    settings: LocationSettings,
    locations: SavedLocation[]
  ): Promise<void> {
    const { latitude, longitude } = position.coords;

    for (const loc of locations) {
      const distance = this.calculateDistance(latitude, longitude, loc.latitude, loc.longitude);
      const isInside = distance <= loc.radius;
      const wasInside = this.insideLocations.has(loc.id);

      if (isInside && !wasInside) {
        // Entered this location
        this.insideLocations.add(loc.id);
        if (loc.notifyOnEnter) {
          console.log(`[LocationService] Entered ${loc.name}`);
          await this.handleArrivingAtLocation(loc, settings);
        }
      } else if (!isInside && wasInside) {
        // Exited this location
        this.insideLocations.delete(loc.id);
        if (loc.notifyOnExit && loc.type === 'home') {
          console.log(`[LocationService] Exited ${loc.name}`);
          await this.handleLeavingHome(settings);
        }
      }
    }
  }

  /**
   * Handle leaving home - show notification for notes tagged as 'leaving_home'
   */
  private async handleLeavingHome(settings: LocationSettings): Promise<void> {
    if (!settings.leaveHomeReminder) return;

    const leavingHomeNotes = await this.getNotesForCategories(['leaving_home']);

    if (leavingHomeNotes.length === 0) {
      console.log('[LocationService] No leaving-home notes, skipping notification');
      return;
    }

    const itemCount = leavingHomeNotes.length;
    const previewItems = leavingHomeNotes
      .slice(0, 3)
      .map(n => n.parsed_data?.summary || n.transcript.substring(0, 30))
      .join(', ');

    await notificationService.scheduleNotification(
      '🏠 Leaving Home',
      `${itemCount} reminder${itemCount > 1 ? 's' : ''}: ${previewItems}${itemCount > 3 ? '...' : ''}`,
      new Date(Date.now() + 1000)
    );
  }

  /**
   * Handle arriving at a location - show relevant notes
   */
  private async handleArrivingAtLocation(
    location: SavedLocation,
    settings: LocationSettings
  ): Promise<void> {
    const relevantCategories = LOCATION_TO_CATEGORIES[location.type] || [];

    if (relevantCategories.length === 0) return;

    const relevantNotes = await this.getNotesForCategories(relevantCategories);

    if (relevantNotes.length === 0 && settings.smartFilteringEnabled) {
      console.log(`[LocationService] No relevant notes for ${location.name}`);
      return;
    }

    if (relevantNotes.length > 0) {
      const itemCount = relevantNotes.length;
      const previewItems = relevantNotes
        .slice(0, 3)
        .map(n => n.parsed_data?.summary || n.transcript.substring(0, 30))
        .join(', ');

      await notificationService.scheduleNotification(
        `📍 Near ${location.name}`,
        `${itemCount} item${itemCount > 1 ? 's' : ''}: ${previewItems}${itemCount > 3 ? '...' : ''}`,
        new Date(Date.now() + 1000)
      );
    }
  }

  /**
   * Get notes for specific categories
   * Only returns location-relevant notes (not time-based reminders)
   */
  private async getNotesForCategories(categories: NoteCategory[]): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      if (categories.length === 0) return [];

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .in('location_category', categories)
        .eq('location_completed', false)
        .or('is_reminder.is.null,is_reminder.eq.false')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('[LocationService] Get notes for categories error:', error);
      return [];
    }
  }

  /**
   * Mark a note as completed (for location-based notes)
   */
  async markNoteLocationCompleted(noteId: string): Promise<void> {
    try {
      await supabase
        .from('notes')
        .update({ location_completed: true })
        .eq('id', noteId);
    } catch (error) {
      console.error('[LocationService] Mark note completed error:', error);
    }
  }

  /**
   * Detect location category from address/name (for auto-categorization)
   */
  detectLocationCategory(name: string, address: string): NoteCategory | null {
    const searchText = `${name} ${address}`.toLowerCase();

    for (const [category, chains] of Object.entries(STORE_CHAINS)) {
      if (chains.some(chain => searchText.includes(chain))) {
        return category as NoteCategory;
      }
    }

    return null;
  }

  /**
   * Search for places using address (uses device geocoding)
   */
  async searchAddress(query: string): Promise<Location.LocationGeocodedAddress[]> {
    try {
      const results = await Location.geocodeAsync(query);
      return results.map((result) => ({
        ...result,
        name: query,
        formattedAddress: query,
      })) as any;
    } catch (error) {
      console.error('[LocationService] Geocode error:', error);
      return [];
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number
  ): Promise<Location.LocationGeocodedAddress | null> {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude, longitude });
      return results[0] || null;
    } catch (error) {
      console.error('[LocationService] Reverse geocode error:', error);
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates in meters (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}

export default new LocationService();
