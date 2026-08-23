import * as Sentry from '@sentry/nextjs';

import { sentryDsn } from '@/lib/env';

/**
 * Error reporting for the panel, on the server side.
 *
 * Next calls `register()` once per runtime before anything is served, which is
 * the only place early enough to catch a failure during a Server Component
 * render -- the coordinator sees a generic error page and nothing else, and
 * without this nobody would ever know which query it was.
 *
 * ## What it does not send
 *
 * `sendDefaultPii` is off, so no IP and no cookies. That matters more here than
 * on the phone: the panel's cookies carry the coordinator's Supabase session,
 * and a session token in a third-party error report is a credential leak
 * wearing a stack trace.
 *
 * ## Without a DSN
 *
 * Nothing starts. That is the state of this repository today -- there is no
 * Sentry project and no DSN -- and it is the same arrangement the mobile app
 * uses, for the same reason: a deployment that believes it is being watched and
 * is not is worse than one that knows it is not.
 */
export function register() {
  if (sentryDsn === null) return;

  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
    // Errors only. Nobody on this project is asking a performance question
    // about a panel a handful of people open, and tracing every request would
    // spend the free tier's quota on answering it.
    tracesSampleRate: 0,
  });
}

/**
 * Errors thrown while rendering, which Next hands over rather than letting
 * them reach `register()`'s handlers. Without this every Server Component
 * failure is invisible.
 */
export const onRequestError = Sentry.captureRequestError;
