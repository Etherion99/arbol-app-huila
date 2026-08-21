import { texts } from '@/constants/texts';
import { authFailureFromCode, toAuthFailure, type AuthFailure } from '@/features/auth/auth-errors';

/** What a screen needs in order to report a failure and offer a way out. */
export type AuthErrorReport = AuthFailure & { message: string };

/**
 * Turns whatever a call threw into a named failure with the sentence that goes
 * on screen. Screens never build these strings themselves, so the wording of
 * every error lives in one file and can be reviewed as a whole.
 */
export function describeAuthError(error: unknown): AuthErrorReport {
  const failure = toAuthFailure(error);
  return { ...failure, message: texts.authErrors[failure.kind] };
}

/** Same, for the `error` a mutation or a query exposes, which may be null. */
export function describeMaybeAuthError(error: unknown): AuthErrorReport | null {
  return error === null || error === undefined ? null : describeAuthError(error);
}

/** For the bare error code a confirmation or recovery link redirects with. */
export function describeAuthErrorCode(code: string): AuthErrorReport {
  const failure = authFailureFromCode(code);
  return { ...failure, message: texts.authErrors[failure.kind] };
}
