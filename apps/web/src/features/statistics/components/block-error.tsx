'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { ErrorState } from '@/components/ui/states';
import { texts } from '@/constants/texts';

/**
 * What one dashboard block shows when its query failed.
 *
 * The dashboard renders on the server, so "reintentar" means asking the server
 * to render again -- `router.refresh()` -- and that call needs a client
 * boundary. This is the whole reason the component exists; the visible part is
 * the catalogue's `ErrorState`, unchanged.
 *
 * Every block gets its own, rather than one banner for the screen. A village
 * chart that timed out must not hide four headline figures that arrived fine,
 * and the coordinator has to be able to see exactly which number is missing.
 */
export function BlockError({ className }: { className?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ErrorState
      body={pending ? texts.common.loading : undefined}
      onRetry={() => startTransition(() => router.refresh())}
      className={className}
    />
  );
}
