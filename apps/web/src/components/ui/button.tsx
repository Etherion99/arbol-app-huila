import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The panel's button, on the design system's variants and sizes.
 *
 * ## Sizes
 *
 * The heights are the accessibility rule, not a taste call: every control has a
 * minimum touch target of 44px, so `md` is 44 and is the default. `sm` (36px)
 * exists for the inline actions inside a dense table row, where the canvas
 * shows a smaller control and the row itself gives the pointer a large target.
 *
 * ## A known contrast finding on `primary`
 *
 * White on Verde Huilense measures 4.29:1. That clears the 3:1 bar for large
 * text but not the 4.5:1 one for small text, so a 15px label on the primary
 * button is below WCAG AA. This is the palette the 2026 branding guide fixes
 * and the design system owns it -- `check-contrast.mjs` says so in as many
 * words: "a token that fails AA is a finding to escalate, not a hex to nudge
 * here". So the button is built as specified and the finding is escalated
 * rather than patched by swapping in `--accent-pressed`, which would clear AA
 * at 5.82:1 but is not the colour the guide names.
 */
const buttonVariants = cva(
  cn(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent',
    'font-sans font-semibold whitespace-nowrap transition-all outline-none select-none',
    'focus-visible:ring-3 focus-visible:ring-border-focus/50 focus-visible:border-border-focus',
    'disabled:pointer-events-none disabled:opacity-45',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ),
  {
    variants: {
      variant: {
        primary: 'bg-accent text-on-accent hover:bg-accent-strong active:bg-accent-pressed',
        secondary:
          'border-border-strong bg-surface-overlay text-text-primary hover:bg-surface-raised',
        /** The inline "Ver · Desactivar" of a table row. */
        ghost: 'text-text-link hover:bg-accent-soft hover:text-text-link-hover',
        /**
         * Archiving. Grey and not red on purpose: nothing is being deleted, and
         * a red button would tell the coordinator otherwise.
         *
         * `on-accent` and not `text-inverse`: the label used to take the latter,
         * which is leaf white `#F4FDF4` and measures 4.43:1 on this grey — seven
         * hundredths under AA for a 15px label. Pure white is 4.61:1 and clears
         * it. The docblock had claimed 4.61 all along; the token underneath it
         * was the wrong white.
         */
        archive: 'bg-state-archived text-on-accent hover:brightness-110',
        /** Reserved for a genuinely destructive action. There are none yet. */
        danger: 'border-danger bg-danger-soft text-destructive hover:brightness-95',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-4 text-[15px]',
        lg: 'h-12 px-5 text-base',
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
      /** Stretches the button to its container, as in the D7 export cards. */
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
);

function Button({
  className,
  variant,
  size,
  block,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
