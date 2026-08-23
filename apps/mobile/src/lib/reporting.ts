import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { sentryDsn } from '@/lib/env';

/**
 * Where a crash goes when nobody is watching the screen it happened on.
 *
 * The guardians are in veredas of La Plata and the coordinator is at the
 * school. When the app dies in somebody's hand there is no console, no
 * developer beside them, and no realistic chance the failure is reported in
 * words a stack trace could be recovered from -- what comes back is "se cerró
 * sola". This is the only channel that turns that into something fixable.
 *
 * ## What it deliberately does not send
 *
 * Anything that identifies a guardian. `sendDefaultPii` is off, so no email, no
 * IP, no username. The user context carries the account identifier and nothing
 * else, because an id is enough to see that one installation is producing every
 * crash and is not enough to know whose it is. A guardian's name, their trees
 * and their photographs are the project's data and do not belong in a
 * third-party service.
 *
 * ## Why the queue is instrumented and the rest is not
 *
 * The failure this project cannot afford is silent loss of a guardian's work,
 * and every path to it runs through the offline queue. So the drain reports
 * what it could not send and why, at `warning`, while an ordinary network error
 * -- the normal state in a vereda -- is not reported at all. A reporter that
 * files a ticket every time the radio drops is a reporter nobody reads.
 *
 * ## Without a DSN
 *
 * Every function here is a no-op. That is the state of this repository today:
 * there is no Sentry project and no DSN, exactly as there is no EAS project and
 * no Maps key. The app runs, the queue drains, and nothing is reported --
 * which is said out loud rather than mimed, because a build that thinks it is
 * being watched and is not is worse than one that knows it is not.
 */

let isStarted = false;

export function startErrorReporting(): void {
  if (isStarted || sentryDsn === null) {
    return;
  }

  Sentry.init({
    dsn: sentryDsn,
    // Never. See the docblock: the guardians' identities are not this
    // service's business.
    sendDefaultPii: false,
    // The build a report came from, so a crash can be tied to a release rather
    // than to "the app". `expo-constants` reads it from app.config.js.
    release: Constants.expoConfig?.version ?? undefined,
    environment: __DEV__ ? 'development' : 'production',
    // Errors only. Performance tracing on a mid range Android in a vereda costs
    // battery and bandwidth the guardian is paying for, to answer a question
    // nobody on this project is asking yet.
    tracesSampleRate: 0,
    enableAutoSessionTracking: false,
  });

  isStarted = true;
}

/** Ties reports to an account without saying who it belongs to. */
export function identifyForReporting(userId: string | null): void {
  if (!isStarted) return;
  Sentry.setUser(userId === null ? null : { id: userId });
}

/**
 * Reports something that went wrong in a way the guardian may not see.
 *
 * `context` is for the shape of the failure -- which kind of write, how many
 * attempts, which cycle -- and never for its contents. A species name is what a
 * guardian typed and a coordinate is where they were standing; neither belongs
 * here, and neither would help.
 */
export function reportProblem(
  message: string,
  context: Record<string, string | number | boolean | null> = {},
  level: 'warning' | 'error' = 'error',
): void {
  if (!isStarted) return;
  Sentry.captureMessage(message, { level, extra: context });
}

/** Reports a thrown error with the same rules. */
export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  if (!isStarted) return;
  Sentry.captureException(error, { extra: context });
}
