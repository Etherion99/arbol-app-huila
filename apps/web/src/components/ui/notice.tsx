import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type NoticeTone = 'info' | 'warning' | 'neutral';

/**
 * The bordered callout the canvas uses for a standing remark: the typo warning
 * on D5, the "sin guardián" explanation on D6.
 *
 * Every tone puts its text in `--text-primary`. The tone is carried by the fill
 * and the icon, for the same contrast reason the badge documents: none of the
 * soft fills can legibly carry text in their own colour.
 */
const tones: Record<NoticeTone, { fill: string; border: string; mark: string }> = {
  info: {
    fill: 'bg-info-soft',
    border: 'border-info/40',
    // Not `text-info`: `#0097DA` measures 2.76:1 over `info-soft` composited
    // on the page, under the 3:1 SC 1.4.11 asks of a meaningful graphic. The
    // mobile `Notice` already draws its info glyph in `textSecondary` for the
    // same reason, so the two now match.
    mark: 'text-text-secondary',
  },
  warning: {
    fill: 'bg-jil-yellow-soft',
    border: 'border-warning/55',
    mark: 'text-earth-brown',
  },
  neutral: {
    fill: 'bg-state-archived-soft',
    border: 'border-border-strong',
    mark: 'text-text-muted',
  },
};

export function Notice({
  tone = 'neutral',
  icon = true,
  children,
  className,
}: {
  tone?: NoticeTone;
  icon?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const { fill, border, mark } = tones[tone];

  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-md border p-3.5 font-sans text-[13px] leading-relaxed',
        'text-text-primary',
        fill,
        border,
        className,
      )}
    >
      {icon ? (
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={cn('mt-px shrink-0', mark)}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v.5M12 11v5" />
        </svg>
      ) : null}
      <div>{children}</div>
    </div>
  );
}
