import { MAX_FULL_NAME_LENGTH, MAX_INSTITUTION_LENGTH, MIN_PASSWORD_LENGTH } from '@arbolapp/core';
import { z } from 'zod/v4';

import { texts } from '@/constants/texts';

/**
 * One schema per form, used both to validate what the guardian typed and to
 * shape what goes to the API. The screen and the call parse the same object,
 * so a field cannot pass the form and then be rejected by the server for a
 * rule the form did not know about.
 *
 * Zod is imported from its `/v4` entry point on purpose. The Expo CLI and the
 * Supabase CLI both pull zod 3.25 into the workspace, and the flat node_modules
 * React Native needs can only hold one copy of it; 3.25 is the release that
 * ships the version 4 API on that subpath, so the app gets the modern schema
 * API without forcing a different major on the build tools.
 */

const { validation } = texts;

/**
 * bcrypt, which is what Supabase Auth hashes with, only looks at the first 72
 * bytes. Accepting more would silently ignore whatever the guardian typed past
 * that, so the limit is stated instead of hidden.
 */
const MAX_PASSWORD_LENGTH = 72;

const email = z
  .string()
  .trim()
  .min(1, { error: validation.emailRequired })
  .toLowerCase()
  .pipe(z.email({ error: validation.emailInvalid }));

const password = z
  .string()
  .min(1, { error: validation.passwordRequired })
  .min(MIN_PASSWORD_LENGTH, { error: validation.passwordTooShort })
  .max(MAX_PASSWORD_LENGTH, { error: validation.passwordTooLong });

const fullName = z
  .string()
  .trim()
  .min(1, { error: validation.fullNameRequired })
  .min(3, { error: validation.fullNameTooShort })
  .max(MAX_FULL_NAME_LENGTH, { error: validation.fullNameTooLong });

const institution = z
  .string()
  .trim()
  .max(MAX_INSTITUTION_LENGTH, { error: validation.institutionTooLong })
  // The column is nullable and an empty string is not a value, it is the
  // absence of one.
  .transform((value) => (value === '' ? null : value));

/**
 * No password is typed twice anywhere in this application.
 *
 * The design system settled it on 21 August 2026 and it is written down in
 * `Especificación de Pantallas.dc.html`: every field that creates a password
 * carries a reveal toggle instead, which lets the guardian check what they
 * wrote without a second box. One field fewer matters on a form filled in
 * standing up, in direct sun, and a mistyped password is recovered through the
 * same flow that produced this screen.
 */
export const signUpSchema = z.object({
  fullName,
  email,
  institution,
  password,
  /**
   * Legal age is not a preference, it is the condition that lets the profile
   * exist at all: the database constrains the column to true. Refining the
   * boolean rather than declaring a literal keeps the field a boolean the
   * checkbox can toggle, while an unchecked box fails validation here
   * instead of travelling to a server that would reject it anyway.
   */
  isAdultConfirmed: z.boolean().refine((value) => value, {
    error: validation.adultRequired,
  }),
  termsAccepted: z.boolean().refine((value) => value, {
    error: validation.termsRequired,
  }),
});

export type SignUpInput = z.input<typeof signUpSchema>;
export type SignUpValues = z.output<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  // Only presence is checked here. Applying the length rule to a sign in would
  // tell someone with an old, shorter password that their password is invalid
  // when what they need to hear is that the credentials do not match.
  password: z.string().min(1, { error: validation.passwordRequired }),
});

export type SignInValues = z.output<typeof signInSchema>;

export const passwordResetRequestSchema = z.object({ email });

export type PasswordResetRequestValues = z.output<typeof passwordResetRequestSchema>;

export const newPasswordSchema = z.object({ password });

export type NewPasswordValues = z.output<typeof newPasswordSchema>;

export const profileSchema = z.object({
  fullName,
  institution,
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileValues = z.output<typeof profileSchema>;
