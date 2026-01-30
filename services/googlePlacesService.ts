import { supabase } from '../config/supabase';
import { ENV } from '../config/env';

const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchText';
const AUTOCOMPLETE_API_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';
const FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.types,places.googleMapsUri,places.location,places.priceLevel';
const CACHE_HOURS = 24;

export interface GooglePlaceResult {
  id: string;
  noteId: string;
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  userRatingCount: number;
  types: string[];
  latitude: number;
  longitude: number;
  googleMapsUri: string;
  priceLevel: string | null;
  searchQuery: string;
  status: 'active' | 'dismissed' | 'navigated';
  fetchedAt: string;
}

export interface NotePlaceGroup {
  noteId: string;
  noteTranscript: string;
  noteSummary: string;
  places: GooglePlaceResult[];
}

/**
 * Check if Google Places API is configured
 */
const isConfigured = (): boolean => {
  return !!(ENV.GOOGLE_PLACES_API_KEY && ENV.GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_KEY_HERE');
};

/**
 * Search Google Places Text Search API
 */
export const searchPlaces = async (
  query: string,
  location: { lat: number; lng: number },
  maxResults = 5
): Promise<Omit<GooglePlaceResult, 'id' | 'noteId' | 'status' | 'fetchedAt'>[]> => {
  if (!isConfigured()) {
    console.warn('[GooglePlaces] API key not configured');
    return [];
  }

  const response = await fetch(PLACES_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': ENV.GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: query,
      locationBias: {
        circle: {
          center: { latitude: location.lat, longitude: location.lng },
          radius: 16000.0, // ~10 miles
        },
      },
      maxResultCount: maxResults,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[GooglePlaces] API error:', response.status, errorData);
    throw new Error(`Google Places API error: ${response.status}`);
  }

  const data = await response.json();

  return (data.places || []).map((place: any) => ({
    placeId: place.id || '',
    name: place.displayName?.text || '',
    address: place.formattedAddress || '',
    rating: place.rating || null,
    userRatingCount: place.userRatingCount || 0,
    types: place.types || [],
    latitude: place.location?.latitude || 0,
    longitude: place.location?.longitude || 0,
    googleMapsUri: place.googleMapsUri || '',
    priceLevel: place.priceLevel || null,
    searchQuery: query,
  }));
};

/**
 * Search for places and store results in Supabase
 */
export const searchAndStoreNotePlaces = async (
  noteId: string,
  searchQuery: string
): Promise<GooglePlaceResult[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check for cached results with the same search query (within 24h)
    const cacheDate = new Date(Date.now() - CACHE_HOURS * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from('note_place_results')
      .select('*')
      .eq('user_id', user.id)
      .eq('search_query', searchQuery)
      .gte('fetched_at', cacheDate)
      .limit(1);

    if (cached && cached.length > 0) {
      // Reuse cached results but link to this note
      const { data: existingForNote } = await supabase
        .from('note_place_results')
        .select('id')
        .eq('note_id', noteId)
        .limit(1);

      if (existingForNote && existingForNote.length > 0) {
        // Already have results for this note
        return cached as GooglePlaceResult[];
      }
    }

    // Get user location from preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('location_lat, location_lng, location_city')
      .eq('user_id', user.id)
      .single();

    if (!prefs?.location_lat || !prefs?.location_lng) {
      console.warn('[GooglePlaces] User location not set');
      return [];
    }

    // Build search query with city for better results
    const fullQuery = prefs.location_city
      ? `${searchQuery} in ${prefs.location_city}`
      : searchQuery;

    // Search Google Places
    const places = await searchPlaces(
      fullQuery,
      { lat: prefs.location_lat, lng: prefs.location_lng }
    );

    if (places.length === 0) return [];

    // Store results in Supabase
    const rows = places.map(place => ({
      user_id: user.id,
      note_id: noteId,
      place_id: place.placeId,
      name: place.name,
      address: place.address,
      rating: place.rating,
      user_rating_count: place.userRatingCount,
      types: place.types,
      latitude: place.latitude,
      longitude: place.longitude,
      google_maps_uri: place.googleMapsUri,
      price_level: place.priceLevel,
      search_query: searchQuery,
      status: 'active',
    }));

    const { data: inserted, error } = await supabase
      .from('note_place_results')
      .upsert(rows, { onConflict: 'note_id,place_id' })
      .select();

    if (error) {
      console.error('[GooglePlaces] Failed to store results:', error);
      return [];
    }

    console.log(`[GooglePlaces] Stored ${inserted?.length || 0} places for note ${noteId}`);
    return (inserted || []) as GooglePlaceResult[];
  } catch (error) {
    console.error('[GooglePlaces] searchAndStoreNotePlaces failed:', error);
    return [];
  }
};

/**
 * Get all active note-based places grouped by note
 */
export const getAllNotePlaces = async (): Promise<NotePlaceGroup[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get active place results with their associated notes
    const { data: results, error } = await supabase
      .from('note_place_results')
      .select('*, notes!inner(id, transcript, parsed_data)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('fetched_at', { ascending: false });

    if (error) {
      console.error('[GooglePlaces] Failed to get note places:', error);
      return [];
    }

    // Group by note
    const grouped = new Map<string, NotePlaceGroup>();

    for (const result of (results || [])) {
      const note = (result as any).notes;
      const noteId = result.note_id;

      if (!grouped.has(noteId)) {
        grouped.set(noteId, {
          noteId,
          noteTranscript: note?.transcript || '',
          noteSummary: note?.parsed_data?.summary || note?.transcript || '',
          places: [],
        });
      }

      grouped.get(noteId)!.places.push({
        id: result.id,
        noteId: result.note_id,
        placeId: result.place_id,
        name: result.name,
        address: result.address,
        rating: result.rating,
        userRatingCount: result.user_rating_count,
        types: result.types || [],
        latitude: result.latitude,
        longitude: result.longitude,
        googleMapsUri: result.google_maps_uri,
        priceLevel: result.price_level,
        searchQuery: result.search_query,
        status: result.status,
        fetchedAt: result.fetched_at,
      });
    }

    return Array.from(grouped.values());
  } catch (error) {
    console.error('[GooglePlaces] getAllNotePlaces failed:', error);
    return [];
  }
};

/**
 * Dismiss a place result
 */
export const dismissNotePlaceResult = async (resultId: string): Promise<void> => {
  const { error } = await supabase
    .from('note_place_results')
    .update({ status: 'dismissed' })
    .eq('id', resultId);

  if (error) {
    console.error('[GooglePlaces] Failed to dismiss result:', error);
    throw error;
  }
};

/**
 * Mark a place as navigated
 */
export const markPlaceNavigated = async (resultId: string): Promise<void> => {
  const { error } = await supabase
    .from('note_place_results')
    .update({ status: 'navigated', navigated_at: new Date().toISOString() })
    .eq('id', resultId);

  if (error) {
    console.error('[GooglePlaces] Failed to mark navigated:', error);
  }
};

// ===== ADDRESS AUTOCOMPLETE =====

export interface AddressSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
}

export interface PlaceDetails {
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Autocomplete address input using Google Places Autocomplete API (New)
 */
export const autocompleteAddress = async (
  input: string,
): Promise<AddressSuggestion[]> => {
  if (!isConfigured() || !input.trim()) return [];

  try {
    const response = await fetch(AUTOCOMPLETE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': ENV.GOOGLE_PLACES_API_KEY,
      },
      body: JSON.stringify({
        input: input.trim(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GooglePlaces] Autocomplete API error:', response.status, errorData);
      return [];
    }

    const data = await response.json();
    return (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat?.mainText?.text || '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
        fullText: s.placePrediction.text?.text || '',
      }));
  } catch (error) {
    console.error('[GooglePlaces] Autocomplete failed:', error);
    return [];
  }
};

/**
 * Get place details (address + coordinates) by place ID
 */
export const getPlaceDetailsById = async (placeId: string): Promise<PlaceDetails | null> => {
  if (!isConfigured() || !placeId) return null;

  try {
    const response = await fetch(`${PLACE_DETAILS_URL}/${placeId}`, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': ENV.GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'formattedAddress,location',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    return {
      address: data.formattedAddress || '',
      latitude: data.location?.latitude || 0,
      longitude: data.location?.longitude || 0,
    };
  } catch (error) {
    console.error('[GooglePlaces] Place details failed:', error);
    return null;
  }
};

/**
 * Convert Google price level to display string
 */
export const formatPriceLevel = (priceLevel: string | null): string => {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE': return 'Free';
    case 'PRICE_LEVEL_INEXPENSIVE': return '$';
    case 'PRICE_LEVEL_MODERATE': return '$$';
    case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
    default: return '';
  }
};
