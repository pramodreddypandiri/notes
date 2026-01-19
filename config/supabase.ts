import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// REPLACE THESE WITH YOUR ACTUAL VALUES FROM STEP 2
const SUPABASE_URL = 'https://mdhuuckzdpnfyplqwwqf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kaHV1Y2t6ZHBuZnlwbHF3d3FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MDk5NzMsImV4cCI6MjA4NDE4NTk3M30.cYEHOfSrSLUUrPEuAjBVjMlcJ_KJN4SYENz6E79d8YY';

// Custom storage adapter that handles SSR for web
const customStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      // During SSR, return null
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      // During SSR, do nothing
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') {
      // During SSR, do nothing
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});