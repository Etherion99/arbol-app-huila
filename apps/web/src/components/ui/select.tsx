'use client';

import type { ComponentProps, ReactNode } from 'react';

import { texts } from '@/constants/texts';
import { cn } from '@/lib/utils';

export type SelectOption = {
  value: string;
  label: string;
};

export type SelectProps = Omit<ComponentProps<'select'>, 'className' | 'children'> & {
  label: ReactNode;
  options: readonly SelectOption[];
  placeholder?: string;
  /** Hides the label visually but keeps it for assistive technology. */
  labelHidden?: boolean;
  className?: string;
};

/**
 * A native `<select>` with the design system's shell around it.
 *
 * Native on purpose. The canvas draws these as pill-shaped filter chips, and a
 * custom listbox would mean re-implementing keyboard navigation and the mobile
 * picker to end up where the platform already is. The chip look is the wrapper;
 * the control underneath is the browser's.
 */
export function Select({
  label,
  options,
  placeholder = texts.ui.selectPlaceholder,
  labelHidden = false,
  className,
  value,
  ...selectProps
}: SelectProps) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span
        className={cn(
          'font-sans text-[13px] font-semibold text-text-secondary',
          labelHidden && 'sr-only',
        )}
      >
        {label}
      </span>
      <span className="relative block">
        <select
          value={value}
          className={cn(
            'h-11 w-full appearance-none rounded-md border border-border-strong',
            'bg-surface-raised pr-9 pl-3.5 font-sans text-[15px] text-text-primary',
            'outline-none transition-all',
            'focus-visible:border-border-focus focus-visible:ring-3 focus-visible:ring-accent-soft',
          )}
          {...selectProps}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text-muted"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </span>
    </label>
  );
}
