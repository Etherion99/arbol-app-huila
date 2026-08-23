import * as Sentry from '@sentry/nextjs';

import { sentryDsn } from '@/lib/env';

/**
 * The same reporter, in the browser.
 *
 * A separate file because Next loads it into the client bundle and the server
 * one never reaches it. What it catches is the half `instrumentation.ts`
 * cannot: an error inside a Client Component, a Server Action that rejected on
 * the way back, a dialog that threw while the coordinator was mid-archive.
 *
 * `replaysSessionSampleRate` is absent on purpose. A session replay of this
 * panel would record a coordinator reading guardians' names and a directory of
 * their email addresses, which is exactly the data this project keeps out of
 * every other surface.
 */
if (sentryDsn !== null) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0,
  });
}
