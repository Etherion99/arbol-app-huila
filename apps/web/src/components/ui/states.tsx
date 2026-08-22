'use client';

import type { ReactNode } from 'react';

import { texts } from '@/constants/texts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * The three things a data block can be instead of data: loading, failed, or
 * genuinely empty.
 *
 * These exist because silent failure is forbidden. A card that renders nothing
 * when its query errors looks exactly like a card whose answer is zero, and on
 * this panel that difference is the difference between "no hay árboles
 * vencidos" and "no sabemos cuántos hay".
 */

export function LoadingState({ label, className }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex items-center justify-center gap-2 p-6 text-text-muted', className)}
    >
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-border-strong border-t-accent"
      />
      <span className="font-sans text-sm">{label ?? texts.common.loading}</span>
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  /** Omitted only when the caller has no way to try again. */
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-border-strong',
        'bg-danger-soft p-6 text-center',
        className,
      )}
    >
      <p className="font-subheading text-[15px] font-semibold text-text-primary">
        {title ?? texts.states.loadFailedTitle}
      </p>
      <p className="font-sans text-sm text-text-secondary">{body ?? texts.states.loadFailedBody}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {texts.common.retry}
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  className,
}: {
  title?: string;
  body?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-2 p-8 text-center', className)}>
      <p className="font-subheading text-[15px] font-semibold text-text-primary">
        {title ?? texts.states.emptyTitle}
      </p>
      {body ? <p className="font-sans text-sm text-text-secondary">{body}</p> : null}
    </div>
  );
}

/**
 * Marks a block whose data source does not exist in the database yet, so a
 * mock-up is never mistaken for a measurement.
 *
 * The rule for this wave is that nothing pretends to have data it does not
 * have. When a screen is laid out ahead of its query, it says so here rather
 * than showing a plausible number.
 */
export function NoDataSourceState({ note, className }: { note?: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1 rounded-md border border-dashed border-border-strong',
        'bg-surface-raised p-6 text-center',
        className,
      )}
    >
      <p className="font-sans text-sm text-text-secondary">{texts.states.notAvailableYet}</p>
      {note ? <p className="font-mono text-xs text-text-muted">{note}</p> : null}
    </div>
  );
}
