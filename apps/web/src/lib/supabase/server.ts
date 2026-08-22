import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import { env } from '@/lib/env';

/**
 * A Supabase client for one server render.
 *
 * Never hoist this into a module level constant. The client carries the
 * caller's session, so a shared instance would serve one coordinator's data to
 * whoever asked next. A new one per request is the whole contract.
 *
 * `setAll` throws inside a Server Component, because a response whose body has
 * started streaming can no longer grow a `Set-Cookie` header. That is expected
 * and swallowed: `proxy.ts` runs before every render and refreshes the session
 * there, where the cookies can still be written. Letting the error escape would
 * turn a routine token refresh into a crashed page.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component. `proxy.ts` already refreshed the
          // session for this request, so there is nothing to recover.
        }
      },
    },
  });
}
