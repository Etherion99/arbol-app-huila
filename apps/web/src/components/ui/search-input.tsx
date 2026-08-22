'use client';

import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type SearchInputProps = Omit<ComponentProps<'input'>, 'className' | 'type'> & {
  /**
   * Named for assistive technology. The canvas shows only a placeholder, and a
   * placeholder is not a label: it disappears the moment somebody types, and a
   * screen reader may never announce it at all.
   */
  label: string;
  className?: string;
};

/** The pill-shaped search box of D3 and D6. */
export function SearchInput({ label, className, ...inputProps }: SearchInputProps) {
  return (
    <label
      className={cn(
        'flex h-11 items-center gap-2 rounded-full border border-border-strong',
        'bg-surface-raised px-3.5 transition-all',
        'focus-within:border-border-focus focus-within:ring-3 focus-within:ring-accent-soft',
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
        className="shrink-0 text-text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        className={cn(
          'min-w-0 flex-1 bg-transparent font-sans text-sm text-text-primary',
          'outline-none placeholder:text-text-muted',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...inputProps}
      />
    </label>
  );
}
