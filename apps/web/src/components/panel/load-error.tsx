'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { ErrorState } from '@/components/ui/states';

/**
 * The failure of a query made on the server, with a retry that actually
 * retries.
 *
 * A Server Component cannot own an `onRetry` handler, and `ErrorState` without
 * one is a dead end: the coordinator reads that something failed and has no way
 * forward but the browser's reload button. `router.refresh()` re-runs the
 * server render with the same URL, which is exactly the retry the rule asks
 * for.
 */
export function LoadError({ title, body }: { title?: string; body?: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  return (
    <ErrorState
      title={title}
      body={body}
      onRetry={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    />
  );
}
