'use client';

import { Field as FieldPrimitive } from '@base-ui/react/field';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * A labelled text input, on the design system's field.
 *
 * Built on Base UI's `Field` rather than a bare `<label>` so the label, the
 * hint and the error are wired to the input by id without every screen
 * remembering to do it. An error announced by `aria-describedby` is the
 * difference between a coordinator hearing why the form refused and hearing
 * nothing at all.
 *
 * The 48px height comes from the canvas, and clears the 44px minimum.
 */
export type TextFieldProps = Omit<ComponentProps<'input'>, 'className'> & {
  label: ReactNode;
  /** Quiet guidance under the field. Replaced by `error` when there is one. */
  hint?: ReactNode;
  error?: ReactNode;
  /** Renders coordinates and measurements in Roboto Mono. */
  mono?: boolean;
  className?: string;
};

export function TextField({
  label,
  hint,
  error,
  mono = false,
  className,
  ...inputProps
}: TextFieldProps) {
  const invalid = Boolean(error);

  return (
    <FieldPrimitive.Root className={cn('flex flex-col gap-1.5', className)} invalid={invalid}>
      <FieldPrimitive.Label className="font-sans text-[13px] font-semibold text-text-secondary">
        {label}
      </FieldPrimitive.Label>
      <FieldPrimitive.Control
        {...inputProps}
        className={cn(
          'h-12 w-full rounded-md border bg-surface-raised px-3.5 text-text-primary',
          'outline-none transition-all placeholder:text-text-muted',
          'focus-visible:border-border-focus focus-visible:ring-3 focus-visible:ring-accent-soft',
          invalid ? 'border-destructive' : 'border-border-strong',
          mono ? 'font-mono text-sm' : 'font-sans text-[15px]',
        )}
      />
      {error ? (
        <FieldPrimitive.Error className="font-sans text-xs text-destructive" match={invalid}>
          {error}
        </FieldPrimitive.Error>
      ) : hint ? (
        <FieldPrimitive.Description className="font-sans text-xs text-text-muted">
          {hint}
        </FieldPrimitive.Description>
      ) : null}
    </FieldPrimitive.Root>
  );
}

/**
 * The multi-line variant. D4's archive reason is the only one so far, and it is
 * the reason this exists: that motive is mandatory and the guardian reads it,
 * so it needs room to be written properly rather than a single line.
 */
export type TextAreaFieldProps = Omit<ComponentProps<'textarea'>, 'className'> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

export function TextAreaField({
  label,
  hint,
  error,
  className,
  rows = 3,
  ...textareaProps
}: TextAreaFieldProps) {
  const invalid = Boolean(error);

  return (
    <FieldPrimitive.Root className={cn('flex flex-col gap-1.5', className)} invalid={invalid}>
      <FieldPrimitive.Label className="font-sans text-[13px] font-semibold text-text-secondary">
        {label}
      </FieldPrimitive.Label>
      {/* The textarea props go onto the rendered element rather than onto
          `Control`, whose own props are typed for an `<input>`. */}
      <FieldPrimitive.Control
        render={<textarea rows={rows} {...textareaProps} />}
        className={cn(
          'w-full resize-y rounded-md border bg-surface-raised p-3 font-sans text-sm',
          'text-text-primary outline-none transition-all placeholder:text-text-muted',
          'focus-visible:border-border-focus focus-visible:ring-3 focus-visible:ring-accent-soft',
          invalid ? 'border-destructive' : 'border-border-strong',
        )}
      />
      {error ? (
        <FieldPrimitive.Error className="font-sans text-xs text-destructive" match={invalid}>
          {error}
        </FieldPrimitive.Error>
      ) : hint ? (
        <FieldPrimitive.Description className="font-sans text-xs text-text-muted">
          {hint}
        </FieldPrimitive.Description>
      ) : null}
    </FieldPrimitive.Root>
  );
}
