import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The panel's data table.
 *
 * A real `<table>` and not the CSS grid the canvas mocks up with. The canvas is
 * a picture: it can afford `display:grid` on a row of spans. A coordinator
 * reading the users list with a screen reader cannot -- without `<th scope>` a
 * cell is a number with no column name attached, and "12" stops meaning
 * "12 árboles". The column widths are kept with `table-fixed` and a colgroup,
 * so the layout still matches the design.
 */
export function Table({ className, ...props }: ComponentProps<'table'>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full border-collapse text-left font-sans text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({ className, ...props }: ComponentProps<'thead'>) {
  return <thead className={cn('border-b border-border-strong', className)} {...props} />;
}

export function TableBody({ className, ...props }: ComponentProps<'tbody'>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<'tr'>) {
  return (
    <tr className={cn('border-b border-border-subtle last:border-b-0', className)} {...props} />
  );
}

/** A column header: monospaced, letter-spaced and uppercase, as in the canvas. */
export function TableHeader({ className, scope = 'col', ...props }: ComponentProps<'th'>) {
  return (
    <th
      scope={scope}
      className={cn(
        'px-4.5 py-3 font-mono text-[10px] font-normal tracking-wide text-text-muted uppercase',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<'td'>) {
  return <td className={cn('px-4.5 py-3.5 align-middle', className)} {...props} />;
}

/**
 * A figure inside a cell. Roboto Mono, because the design system reserves it
 * for coordinates and measurements and a column of counts only lines up in a
 * monospaced face.
 */
export function TableFigure({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('font-mono text-text-primary', className)} {...props} />;
}
