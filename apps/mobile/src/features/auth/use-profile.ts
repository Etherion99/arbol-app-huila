import type { IsoDateTime, UserRole, Uuid } from '@arbolapp/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod/v4';

import type { ProfileValues } from '@/features/auth/auth-schemas';
import { useSession } from '@/features/auth/session-provider';
import { supabase } from '@/lib/supabase/client';

/** The guardian as their own profile screen shows them. */
export type GuardianProfile = {
  id: Uuid;
  fullName: string;
  email: string;
  role: UserRole;
  institution: string | null;
  isAdultConfirmed: boolean;
  termsAcceptedAt: IsoDateTime;
  createdAt: IsoDateTime;
};

/**
 * PostgREST answers with untyped JSON, so the row is parsed before anything
 * reads it. That keeps `any` out of the app and turns a column renamed by a
 * migration into a loud failure here instead of an `undefined` painted on the
 * profile screen.
 */
const profileRowSchema = z.object({
  id: z.uuid(),
  full_name: z.string(),
  email: z.string(),
  role: z.enum(['guardian', 'coordinator']),
  institution: z.string().nullable(),
  is_adult_confirmed: z.boolean(),
  terms_accepted_at: z.string(),
  created_at: z.string(),
});

function toGuardianProfile(row: z.output<typeof profileRowSchema>): GuardianProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    institution: row.institution,
    isAdultConfirmed: row.is_adult_confirmed,
    termsAcceptedAt: row.terms_accepted_at,
    createdAt: row.created_at,
  };
}

export const profileQueryKey = (userId: string | null) => ['profile', userId] as const;

/**
 * The profile is read from `user_directory` and not from `users`, because the
 * email is only reachable there. Neither `anon` nor `authenticated` holds a
 * privilege on `users.email`, which is what stops any endpoint from exposing a
 * guardian's address; the view runs as its owner and hands the column back to
 * the row's own owner and to coordinators, and to nobody else.
 */
export function useProfile() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  return useQuery({
    queryKey: profileQueryKey(userId),
    enabled: userId !== null,
    queryFn: async (): Promise<GuardianProfile | null> => {
      const { data, error } = await supabase
        .from('user_directory')
        .select(
          'id, full_name, email, role, institution, is_adult_confirmed, terms_accepted_at, created_at',
        )
        .eq('id', userId)
        .maybeSingle<unknown>();

      if (error) {
        throw error;
      }
      if (data === null) {
        // An auth identity with no profile row. The trigger makes this
        // impossible for a sign up made through the app, so it means somebody
        // created the identity by hand; the screen says so and offers a way
        // out rather than rendering an empty form.
        return null;
      }

      return toGuardianProfile(profileRowSchema.parse(data));
    },
  });
}

/**
 * Writes go to `users`, which is the table the update policy protects. The
 * policy also pins the role to the stored one, so a guardian editing their
 * name cannot promote themselves on the way.
 */
export function useUpdateProfile() {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (values: ProfileValues) => {
      if (userId === null) {
        throw new Error('there is no session to update a profile for');
      }

      const { error } = await supabase
        .from('users')
        .update({ full_name: values.fullName, institution: values.institution })
        .eq('id', userId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) }),
  });
}
