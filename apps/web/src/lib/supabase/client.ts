'use client';

import { createBrowserClient } from '@supabase/ssr';

import { env } from '@/lib/env';

/**
 * The browser half of the panel's session.
 *
 * `createBrowserClient` keeps the session in cookies rather than in
 * `localStorage`, which is what lets the server read it too. The mobile app
 * stores its session in the device keystore because a phone has no server to
 * share it with; here both halves have to see the same session, so the cookie
 * is the storage and this client and the server one agree on it.
 *
 * It is a singleton by default, so calling this from several components does
 * not open several realtime connections.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
