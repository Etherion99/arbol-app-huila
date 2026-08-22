'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup } from '@base-ui/react/radio-group';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * The two selection controls the species merge needs: a checkbox per variant,
 * and one radio across them to pick the surviving name.
 *
 * Both are whole rows rather than bare boxes, because that is what the canvas
 * draws and because a 20px box is well under the 44px touch target. The row is
 * the target; the box is only what it looks like.
 */

export type CheckboxRowProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  /** The right-aligned count: "48 árboles". */
  meta?: ReactNode;
  disabled?: boolean;
  className?: string;
};

export function CheckboxRow({
  checked,
  onCheckedChange,
  children,
  meta,
  disabled,
  className,
}: CheckboxRowProps) {
  return (
    <label
      className={cn(
        'flex min-h-hit cursor-pointer items-center gap-3 px-4 py-3 transition-colors',
        'has-focus-visible:ring-3 has-focus-visible:ring-inset has-focus-visible:ring-border-focus/50',
        checked ? 'bg-accent-soft' : 'hover:bg-surface-raised',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <CheckboxPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors outline-none',
          checked ? 'border-accent bg-accent' : 'border-border-strong bg-surface-raised',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="var(--on-accent)"
            strokeWidth="3"
            aria-hidden="true"
          >
            <path d="M5 13l4 4 10-10" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className="flex-1 font-sans text-sm text-text-primary">{children}</span>
      {meta ? <span className="font-mono text-xs text-text-secondary">{meta}</span> : null}
    </label>
  );
}

export type RadioRowProps = {
  value: string;
  children: ReactNode;
  meta?: ReactNode;
  /** Drawn as selected. Read from the group, so the row can style itself. */
  selected?: boolean;
  className?: string;
};

export function RadioRow({ value, children, meta, selected, className }: RadioRowProps) {
  return (
    <label
      className={cn(
        'flex min-h-hit cursor-pointer items-center gap-2.5 rounded-md border px-3.5 py-2.5 transition-colors',
        'has-focus-visible:ring-3 has-focus-visible:ring-border-focus/50',
        selected
          ? 'border-[1.5px] border-accent bg-accent-soft'
          : 'border-border-strong bg-surface-raised hover:bg-surface-card',
        className,
      )}
    >
      <RadioPrimitive.Root
        value={value}
        className={cn(
          'size-4.5 shrink-0 rounded-full border transition-all outline-none',
          selected ? 'border-[5px] border-accent' : 'border-[1.5px] border-border-strong',
        )}
      >
        <RadioPrimitive.Indicator />
      </RadioPrimitive.Root>
      <span className={cn('font-sans text-[15px] text-text-primary', selected && 'font-semibold')}>
        {children}
      </span>
      {meta ? <span className="ml-auto font-mono text-xs text-text-muted">{meta}</span> : null}
    </label>
  );
}

export { RadioGroup };
