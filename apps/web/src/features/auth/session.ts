import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import type { UserRole, Uuid } from '@arbolapp/core';

import { createClient } from '@/lib/supabase/server';
import { DENIED_PARAM, REDIRECT_PARAM, routes } from '@/lib/routes';

/** Who is looking at the panel, as the panel chrome needs to render them. */
export type PanelSession = {
  userId: Uuid;
  fullName: string;
  email: string;
  role: UserRole;
  institution: string | null;
  /** Initials for the avatar in the sidebar, e.g. "Carlos Perdomo" to "CP". */
  initials: string;
};

/**
 * Why the gate refused, so the sign in screen can say something true rather
 * than showing an empty form again.
 */
export type DenialReason = 'no-session' | 'not-coordinator' | 'no-profile';

/**
 * Reads the caller's session and profile once per render pass.
 *
 * `cache` is what makes it once: the layout asks for the coordinator, and so
 * does any screen that names them, and without memoisation that is one auth
 * round trip and one query each time. The cache is per request, so it never
 * leaks one coordinator's profile into another's render.
 *
 * Returns `null` rather than redirecting, so a caller can decide. The screens
 * use `requireCoordinator()` below.
 */
export const readPanelSession = cache(
  async (): Promise<{ session: PanelSession } | { denial: DenialReason }> => {
    const supabase = await createClient();

    // `getUser()` revalidates the token against the auth server. `getSession()`
    // would only decode the cookie, and the cookie is attacker-writable, so it
    // is not something a role gate may trust.
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { denial: 'no-session' };

    // `user_directory` and not `users`: the email lives behind a column grant
    // that neither `anon` nor `authenticated` holds, and this view is the one
    // place it is reachable -- for a coordinator, or for the caller's own row.
    const { data: profile, error } = await supabase
      .from('user_directory')
      .select('id, full_name, email, role, institution')
      .eq('id', user.id)
      .maybeSingle();

    // A signed in account with no profile row means the provisioning trigger
    // never ran. Treated as a denial and never as a coordinator: failing open
    // here would hand the panel to anyone who can create an auth user.
    if (error || !profile) return { denial: 'no-profile' };
    if (profile.role !== 'coordinator') return { denial: 'not-coordinator' };

    return {
      session: {
        userId: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.role,
        institution: profile.institution,
        initials: initialsOf(profile.full_name),
      },
    };
  },
);

/**
 * The gate every panel screen sits behind.
 *
 * This is the real check, and it is deliberately here rather than in
 * `proxy.ts`: proxy sees only the cookie, and the cookie does not say who is a
 * coordinator. Running it in the layout means one query decides for every
 * screen underneath, so no screen can forget it.
 *
 * Row level security is still the last word. Even if this were bypassed, a
 * guardian's token reaches only their own rows. This gate is what turns that
 * into an honest screen instead of an empty one.
 */
export async function requireCoordinator(currentPath?: string): Promise<PanelSession> {
  const result = await readPanelSession();

  if ('session' in result) return result.session;

  const target = new URLSearchParams();
  target.set(DENIED_PARAM, result.denial);
  if (currentPath) target.set(REDIRECT_PARAM, currentPath);

  redirect(`${routes.signIn}?${target.toString()}`);
}

/**
 * First letter of the first two words of the name. Used for the sidebar
 * avatar, where the design shows "CP" for Carlos Perdomo.
 */
export function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toLocaleUpperCase('es-CO'))
    .join('');
}
