import { createClient, processLock } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/lib/env';
import { secureSessionStorage } from '@/lib/supabase/secure-session-storage';

/**
 * The one Supabase client of the app. Screens never touch it: they go through
 * the data hooks, so caching, retries and the offline queue keep living in a
 * single place.
 */
export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: secureSessionStorage,
    // Names the SecureStore entries. The chunk suffixes the storage adds keep
    // it inside the alphanumeric, dot, dash and underscore charset the
    // platform keystores accept.
    storageKey: 'arbolapp.auth.session',
    persistSession: true,
    autoRefreshToken: true,
    // There is no address bar on a phone. The tokens that come back from the
    // confirmation and recovery emails are read by the deep link handler.
    detectSessionInUrl: false,
    // The code exchange never puts a token in the link itself, which on a
    // phone would otherwise sit in the system log of whatever opened it.
    flowType: 'pkce',
    // React Native has no Web Locks API, so the browser lock the client
    // defaults to would never resolve and every refresh would hang.
    lock: processLock,
  },
});

/**
 * The refresh timer has to follow the application state. React Native freezes
 * timers in the background, so a timer left running would come back to life
 * long after the token expired, refresh against a rejected token, and drop a
 * guardian who only had the app in the background for an afternoon.
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
