'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type { ReactNode } from 'react';

import { texts } from '@/constants/texts';
import { cn } from '@/lib/utils';

/**
 * The panel's modal, on Base UI's dialog so the focus trap, the escape key and
 * the `aria-modal` wiring come from a primitive instead of being re-invented.
 *
 * The overlay is the canvas's: ink at 45% with the design system's backdrop
 * blur behind it.
 */
export const DialogRoot = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export type DialogProps = {
  title: ReactNode;
  /**
   * The sentence under the title. Passed through `Dialog.Description`, so a
   * screen reader announces it with the dialog rather than leaving the reader
   * to find it -- which for D4 is the difference between hearing "nada se
   * borra" before confirming and not hearing it at all.
   */
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function DialogContent({ title, description, children, footer, className }: DialogProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        className={cn(
          'fixed inset-0 z-50 bg-[rgba(26,26,26,0.45)] backdrop-blur-[4px]',
          'transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0',
        )}
      />
      <DialogPrimitive.Popup
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex w-[calc(100vw-2.5rem)] max-w-[460px]',
          '-translate-x-1/2 -translate-y-1/2 flex-col gap-3.5 rounded-xl',
          'border border-border-strong bg-surface-overlay p-6 shadow-overlay',
          'transition-all duration-150 data-ending-style:scale-[0.98] data-ending-style:opacity-0',
          'data-starting-style:scale-[0.98] data-starting-style:opacity-0',
          className,
        )}
      >
        <DialogPrimitive.Title className="font-heading text-xl font-bold text-text-primary">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="font-sans text-sm leading-relaxed text-text-secondary">
            {description}
          </DialogPrimitive.Description>
        ) : null}
        {children}
        {footer ? <div className="mt-1 flex justify-end gap-2.5">{footer}</div> : null}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

/** The bare close control, for a dialog that wants an × in its corner. */
export function DialogCloseButton({ className }: { className?: string }) {
  return (
    <DialogPrimitive.Close
      aria-label={texts.ui.dialogClose}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-md text-text-muted',
        'transition-colors hover:bg-surface-raised hover:text-text-primary',
        'focus-visible:ring-3 focus-visible:ring-border-focus/50 focus-visible:outline-none',
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden="true"
      >
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </DialogPrimitive.Close>
  );
}
