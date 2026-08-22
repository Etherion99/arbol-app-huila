import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

import { env, isEnvComplete } from '@/lib/env';
import { PANEL_PREFIX, REDIRECT_PARAM, routes } from '@/lib/routes';

/**
 * Runs before every panel render. Two jobs, in this order.
 *
 * First it refreshes the Supabase session. A Server Component cannot write
 * `Set-Cookie` once its response has started streaming, so this is the only
 * place a rotated refresh token can be handed back to the browser. Without it
 * the coordinator is signed out roughly every hour, in the middle of whatever
 * they were doing.
 *
 * Then it redirects anyone without a session away from `/panel`. This is an
 * optimistic check and deliberately not the real gate: it reads the session,
 * not the role, because proxy runs on prefetches too and a database round trip
 * per prefetched link would be paid on every hover. The gate that decides who
 * is a coordinator lives in `features/auth/session.ts`, next to the data.
 *
 * Note for anyone arriving from an older Next.js: this file used to be called
 * `middleware.ts`. Next.js 16 renamed the convention to `proxy.ts`.
 */
export async function proxy(request: NextRequest) {
  // Nothing to refresh and nothing to protect if the deployment has no
  // Supabase to talk to. The screens report the missing variables themselves.
  if (!isEnvComplete) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // A response that carries a refreshed session must never be cached by
        // a CDN: the next visitor would be handed someone else's tokens.
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // `getUser()` and not `getSession()`: this one asks the auth server whether
  // the token is real, and the cookie is attacker-writable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const isPanel = pathname === PANEL_PREFIX || pathname.startsWith(`${PANEL_PREFIX}/`);

  if (isPanel && !user) {
    const target = request.nextUrl.clone();
    target.pathname = routes.signIn;
    target.search = '';
    target.searchParams.set(REDIRECT_PARAM, `${pathname}${search}`);
    return NextResponse.redirect(target);
  }

  return response;
}

export const config = {
  // Static assets and image optimisation never carry a session worth
  // refreshing, and running on them would cost a round trip per file.
  // `[.]` is the literal dot: a character class rather than an escape, so the
  // pattern reads the same here as it does in the compiled matcher.
  matcher: [
    '/((?!_next/static|_next/image|favicon[.]ico|.*[.](?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
