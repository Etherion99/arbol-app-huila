import { AUTH_CALLBACK_URL, PASSWORD_RESET_URL, type SignUpMetadata } from '@arbolapp/core';
import { onlineManager, useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  NewPasswordValues,
  PasswordResetRequestValues,
  SignInValues,
  SignUpValues,
} from '@/features/auth/auth-schemas';
import { OfflineError } from '@/features/auth/auth-errors';
import { markSignOutRequested } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase/client';

/**
 * Every write the authentication screens perform. Screens never call Supabase
 * directly: keeping the calls here is what lets the offline check, the error
 * shape and the cache invalidation be written once.
 */

/**
 * Refuses before the request leaves the device when the radio is plainly down.
 * Without it the guardian waits out a timeout to be told something vague; with
 * it they are told immediately, and correctly, that there is no signal.
 */
function requireConnection() {
  if (!onlineManager.isOnline()) {
    throw new OfflineError();
  }
}

export function useSignUp() {
  return useMutation({
    mutationFn: async (values: SignUpValues) => {
      requireConnection();

      // Read by `public.handle_new_auth_user()`, which creates the guardian
      // profile in the same transaction as the credential. The keys are the
      // contract with that trigger and live in packages/core.
      const metadata: SignUpMetadata = {
        full_name: values.fullName,
        institution: values.institution,
        is_adult_confirmed: values.isAdultConfirmed,
        terms_accepted: values.termsAccepted,
      };

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: { data: metadata, emailRedirectTo: AUTH_CALLBACK_URL },
      });

      if (error) {
        throw error;
      }

      // With confirmations on, Supabase answers the same way for a brand new
      // address and for one that already exists, so that nobody can use the
      // form to find out who is registered. An identity that comes back with
      // no identities attached is that second case, and the guardian is better
      // served by being sent to sign in than by waiting for an email that will
      // never arrive.
      const isExistingAccount = data.user !== null && data.user.identities?.length === 0;

      return { email: values.email, isExistingAccount };
    },
  });
}

export function useSignIn() {
  return useMutation({
    mutationFn: async (values: SignInValues) => {
      requireConnection();

      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        throw error;
      }

      return { email: values.email };
    },
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Tells the session listener this departure was asked for, so it does
      // not report it as an expired session on the sign in screen.
      markSignOutRequested();

      // `local` on purpose: revoking every session server side would need a
      // round trip that fails without signal, and a guardian who wants out of
      // this phone has to get out of this phone even in a vereda with no bars.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        throw error;
      }
    },
    onSettled: () => queryClient.clear(),
  });
}

export function useResendConfirmationEmail() {
  return useMutation({
    mutationFn: async (email: string) => {
      requireConnection();

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: AUTH_CALLBACK_URL },
      });

      if (error) {
        throw error;
      }
    },
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (values: PasswordResetRequestValues) => {
      requireConnection();

      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: PASSWORD_RESET_URL,
      });

      if (error) {
        throw error;
      }

      return { email: values.email };
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (values: NewPasswordValues) => {
      requireConnection();

      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) {
        throw error;
      }
    },
  });
}
