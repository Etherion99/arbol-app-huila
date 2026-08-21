import { isAuthApiError, isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

/**
 * Every way an authentication call is allowed to fail, named so a screen can
 * say what happened and what to do next. "Ocurrió un error" is banned: a
 * guardian standing in a field with one bar of signal has to be able to tell
 * a wrong password from a radio that dropped, because the two need opposite
 * reactions.
 */
export type AuthFailureKind =
  | 'offline'
  | 'network'
  | 'emailTaken'
  | 'weakPassword'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'emailRateLimited'
  | 'tooManyRequests'
  | 'sessionExpired'
  | 'linkExpired'
  | 'samePassword'
  | 'invalidEmail'
  | 'signUpDisabled'
  | 'unknown';

export type AuthFailure = {
  kind: AuthFailureKind;
  /** Whether pressing the same button again could plausibly work. */
  isRetryable: boolean;
};

const RETRYABLE: ReadonlySet<AuthFailureKind> = new Set<AuthFailureKind>([
  'offline',
  'network',
  'unknown',
]);

function failure(kind: AuthFailureKind): AuthFailure {
  return { kind, isRetryable: RETRYABLE.has(kind) };
}

/**
 * Maps a code Supabase returns onto one of ours. The server also emits codes
 * newer than the SDK knows about, so anything unlisted falls through to
 * `unknown`, which is reported as a failure the guardian may retry rather than
 * swallowed.
 */
function fromErrorCode(code: string): AuthFailureKind {
  switch (code) {
    case 'email_exists':
    case 'user_already_exists':
      return 'emailTaken';
    case 'weak_password':
      return 'weakPassword';
    case 'invalid_credentials':
      return 'invalidCredentials';
    case 'email_not_confirmed':
      return 'emailNotConfirmed';
    case 'over_email_send_rate_limit':
      return 'emailRateLimited';
    case 'over_request_rate_limit':
      return 'tooManyRequests';
    case 'session_expired':
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'refresh_token_already_used':
    case 'bad_jwt':
      return 'sessionExpired';
    case 'otp_expired':
    case 'flow_state_expired':
    case 'flow_state_not_found':
    case 'bad_code_verifier':
      return 'linkExpired';
    case 'same_password':
      return 'samePassword';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'invalidEmail';
    case 'signup_disabled':
    case 'email_provider_disabled':
      return 'signUpDisabled';
    default:
      return 'unknown';
  }
}

/**
 * For a code that arrives on its own rather than attached to a thrown error,
 * which is how the confirmation and recovery links report a dead token: Auth
 * redirects with the reason in the query string instead of failing a request.
 */
export function authFailureFromCode(code: string): AuthFailure {
  return failure(fromErrorCode(code));
}

/** Thrown by the hooks when the device reports no connection before the call. */
export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}

export function toAuthFailure(error: unknown): AuthFailure {
  if (error instanceof OfflineError) {
    return failure('offline');
  }

  // A fetch that never reached Supabase. Distinguishing it matters: the
  // guardian did nothing wrong and the same button will work once the signal
  // comes back.
  if (isAuthRetryableFetchError(error)) {
    return failure('network');
  }

  if (isAuthApiError(error)) {
    if (error.code) {
      return failure(fromErrorCode(error.code));
    }
    // Older deployments answer 429 without a code.
    if (error.status === 429) {
      return failure('tooManyRequests');
    }
    return failure('unknown');
  }

  if (isAuthError(error)) {
    return failure(error.code ? fromErrorCode(error.code) : 'unknown');
  }

  // Not an auth error at all: PostgREST failing on the profile read, or fetch
  // rejecting before the SDK wrapped it.
  if (error instanceof TypeError) {
    return failure('network');
  }

  return failure('unknown');
}
