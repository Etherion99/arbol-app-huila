import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The panel's one surface: white card, subtle border, large radius. Every
 * grouped block in the canvas from D2 to D7 is this rectangle, so it is a
 * component rather than four utilities repeated on every screen.
 */
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg border border-border-subtle bg-surface-card', className)}
      {...props}
    />
  );
}

/**
 * The small monospaced, letter-spaced caption the canvas puts above every card
 * body: "POR VEREDA", "DATOS", "REASIGNAR GUARDIÁN".
 *
 * Rendered as a real heading so the panel has an outline a screen reader can
 * navigate. `level` picks the rank; the look never changes with it.
 */
export function CardHeading({
  children,
  level = 2,
  className,
}: {
  children: ReactNode;
  level?: 2 | 3;
  className?: string;
}) {
  const Tag = level === 2 ? 'h2' : 'h3';

  return (
    <Tag className={cn('font-mono text-[10px] tracking-wide text-text-muted uppercase', className)}>
      {children}
    </Tag>
  );
}

/** The display-face title used for a screen's own name: "Tablero", "Usuarios". */
export function ScreenTitle({
  children,
  suffix,
  className,
}: {
  children: ReactNode;
  /** The muted monospaced count the canvas hangs off the title. */
  suffix?: ReactNode;
  className?: string;
}) {
  return (
    <h1 className={cn('font-heading text-2xl font-extrabold text-text-primary', className)}>
      {children}
      {suffix ? (
        <span className="ml-2 font-mono text-sm font-normal text-text-muted">{suffix}</span>
      ) : null}
    </h1>
  );
}
