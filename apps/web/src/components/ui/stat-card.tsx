import type { ReactNode } from 'react';

import { Card, CardHeading } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * One of the four indicator cards at the top of the dashboard: a monospaced
 * caption, a large display-face figure, and a quiet line of context under it.
 *
 * `value` is a string and not a number on purpose. Percentages are written the
 * Colombian way, with a comma -- "87,8%" -- so the formatting decision belongs
 * to the caller, next to the data, and not to a component guessing a locale.
 */
export function StatCard({
  label,
  value,
  footnote,
  emphasis = false,
  className,
}: {
  label: string;
  value: ReactNode;
  footnote?: ReactNode;
  /** Paints the figure in Verde Huilense, as the canvas does for "vivos". */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn('p-4.5', className)}>
      <CardHeading level={3}>{label}</CardHeading>
      <p
        className={cn(
          'mt-1.5 font-heading text-[34px] leading-none font-extrabold',
          emphasis ? 'text-accent' : 'text-text-primary',
        )}
      >
        {value}
      </p>
      {footnote ? <p className="mt-1 font-mono text-[11px] text-text-muted">{footnote}</p> : null}
    </Card>
  );
}
