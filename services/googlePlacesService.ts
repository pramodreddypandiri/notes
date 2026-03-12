import { ENV } from '../config/env';

const AUTOCOMPLETE_API_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';

/**
 * Check if Google Places API is configured
 */
const isConfigured = (): boolean => {
  return !!(ENV.GOOGLE_PLACES_API_KEY && ENV.GOOGLE_PLACES_API_KEY !== 'YOUR_GOOGLE_PLACES_KEY_HERE');
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
  console.log('[GooglePlaces] autocompleteAddress called with:', input);
  console.log('[GooglePlaces] isConfigured:', isConfigured());

  if (!isConfigured()) {
    console.warn('[GooglePlaces] API key not configured - check GOOGLE_PLACES_API_KEY');
    return [];
  }
  if (!input.trim()) return [];

  try {
    console.log('[GooglePlaces] Making API request to:', AUTOCOMPLETE_API_URL);
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

    console.log('[GooglePlaces] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[GooglePlaces] Autocomplete API error:', response.status, errorData);
      return [];
    }

    const data = await response.json();
    console.log('[GooglePlaces] Response data:', JSON.stringify(data).substring(0, 500));

    const results = (data.suggestions || [])
      .filter((s: any) => s.placePrediction)
      .map((s: any) => ({
        placeId: s.placePrediction.placeId,
        mainText: s.placePrediction.structuredFormat?.mainText?.text || '',
        secondaryText: s.placePrediction.structuredFormat?.secondaryText?.text || '',
        fullText: s.placePrediction.text?.text || '',
      }));

    console.log('[GooglePlaces] Parsed results:', results.length);
    return results;
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
