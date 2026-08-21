/**
 * The contract between the sign up call and the database trigger that turns it
 * into a guardian profile.
 *
 * `public.handle_new_auth_user()` reads these exact keys out of
 * `auth.users.raw_user_meta_data`. They are snake_case because they travel as
 * a JSON payload read by SQL, not as TypeScript identifiers; renaming one here
 * without renaming it in the migration silently stops provisioning profiles.
 */
export type SignUpMetadata = {
  full_name: string;
  /** Optional school or organisation. Empty is stored as null. */
  institution: string | null;
  /**
   * Express declaration of legal age. The platform admits adults only, and the
   * profile table constrains the column to true, so a sign up without it
   * cannot produce a profile.
   */
  is_adult_confirmed: boolean;
  /**
   * Acceptance of the terms and the privacy notice. The date is stamped by the
   * database rather than sent from here: an acceptance is a legal record and
   * the device clock is not evidence.
   */
  terms_accepted: boolean;
};

/**
 * Shortest password the platform accepts. Mirrors
 * `auth.minimum_password_length` in `supabase/config.toml`; the two have to
 * agree or the client accepts a password the server then rejects.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Longest name the profile form accepts, matched to a sensible column width. */
export const MAX_FULL_NAME_LENGTH = 120;

/** Longest institution the profile form accepts. */
export const MAX_INSTITUTION_LENGTH = 120;

/**
 * Seconds a guardian has to wait before asking for another confirmation email.
 * Mirrors `auth.email.max_frequency`, and exists mostly to keep the guardian
 * from burning the hourly quota of the bundled email service on their own
 * account.
 */
export const EMAIL_RESEND_COOLDOWN_SECONDS = 60;

/** Deep link the confirmation email returns to. */
export const AUTH_CALLBACK_URL = 'arbolapp://auth/callback';

/**
 * Deep link the password recovery email returns to. It lands straight on the
 * screen that asks for the new password, which is the route the screen
 * specification names.
 */
export const PASSWORD_RESET_URL = 'arbolapp://reset-password';
