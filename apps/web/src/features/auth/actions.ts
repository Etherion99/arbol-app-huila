'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

import { texts } from '@/constants/texts';
import { routes, safeRedirect } from '@/lib/routes';
import { createClient } from '@/lib/supabase/server';
import { isEnvComplete } from '@/lib/env';

/**
 * What the sign in form gets back. A message and never a thrown error: the
 * screen has to be able to show the guardian why it failed, and an exception
 * crossing the server boundary arrives as a generic digest with the reason
 * stripped out.
 */
export type SignInState = {
  error: string | null;
  /** Set when the failure is in one field, so the screen can point at it. */
  field?: 'email' | 'password';
};

/**
 * Turns whatever Supabase reports into one of our sentences.
 *
 * The raw messages are English strings written for developers, and they change
 * between releases. Matching once here means the screens never show them and
 * one wording review covers the lot.
 */
function messageFor(error: { message: string; code?: string; status?: number }): string {
  const code = error.code ?? '';
  const message = error.message.toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return texts.signIn.errors.invalidCredentials;
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return texts.signIn.errors.emailNotConfirmed;
  }
  if (error.status === 429 || code === 'over_request_rate_limit') {
    return texts.signIn.errors.rateLimited;
  }
  if (message.includes('fetch') || message.includes('network')) {
    return texts.signIn.errors.network;
  }
  return texts.signIn.errors.unknown;
}

/**
 * Signs a coordinator in.
 *
 * It deliberately does not check the role. A guardian's password is correct
 * and their session is real, so refusing here would mean saying "credenciales
 * incorrectas" to somebody whose credentials are fine. The role gate in
 * `features/auth/session.ts` turns them away at `/panel` with a sentence that
 * explains the actual reason, and their session stays valid for the phone.
 */
export async function signIn(_previous: SignInState, formData: FormData): Promise<SignInState> {
  if (!isEnvComplete) return { error: texts.config.title };

  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = safeRedirect(formData.get('next')?.toString());

  if (!email) return { error: texts.signIn.errors.emailRequired, field: 'email' };
  if (!password) return { error: texts.signIn.errors.passwordRequired, field: 'password' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: messageFor(error), field: 'password' };

  // The layout reads the session on the server, so its cached render has to go.
  revalidatePath('/', 'layout');
  redirect(next);
}

/** Ends the session and returns to the sign in screen. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  redirect(routes.signIn);
}
