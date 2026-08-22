import type { ReactNode } from 'react';

import type { TrackingStatus } from '@arbolapp/core';

import { texts } from '@/constants/texts';
import { cn } from '@/lib/utils';

/**
 * The five tree states, plus the two the panel needs that are not tree states:
 * a neutral grey and the Juventud en línea affiliation mark.
 */
export type BadgeTone = TrackingStatus | 'neutral' | 'jil';

/**
 * A state badge: soft fill, a dot in the state colour, and a label.
 *
 * ## Why the label is not in the state colour
 *
 * The design canvas paints these labels in the state's own colour on the
 * state's own soft fill -- `--state-ok` on `--state-ok-soft` and so on. At
 * badge size that pairing does not clear WCAG AA: `pnpm test:contrast` measures
 * every soft fill composited over the page and reports that *none* of them can
 * carry its own colour as small text. The worst is `due`, where `#FFD700` on
 * its own blend reaches 1.25:1 against a required 4.5:1.
 *
 * So the label is `--text-primary`, which clears 13:1 or better on every one of
 * these fills, and the state colour stays as the dot and the border -- graphics,
 * where SC 1.4.11 asks for 3:1 rather than 4.5:1. The badge still reads as its
 * state at a glance and the word is actually legible.
 *
 * The dot is redundant by design: the label always names the state, so a reader
 * who cannot resolve a pale yellow dot has lost nothing. That is what makes the
 * `due` dot acceptable at 1.25:1 -- it decorates, it does not inform.
 *
 * `check-contrast.mjs` would not have caught this. It validates tokens against
 * the rules `theme.ts` documents, not the pairs a component actually puts on
 * screen, so it reports green either way.
 */
const tones: Record<BadgeTone, { fill: string; mark: string; label: string }> = {
  up_to_date: {
    fill: 'bg-state-ok-soft',
    mark: 'bg-state-ok',
    label: texts.treeState.up_to_date,
  },
  due_soon: {
    fill: 'bg-state-due-soft',
    mark: 'bg-state-due',
    label: texts.treeState.due_soon,
  },
  overdue: {
    fill: 'bg-state-overdue-soft',
    mark: 'bg-state-overdue',
    label: texts.treeState.overdue,
  },
  dead: {
    fill: 'bg-state-dead-soft',
    mark: 'bg-state-dead',
    label: texts.treeState.dead,
  },
  archived: {
    fill: 'bg-state-archived-soft',
    mark: 'bg-state-archived',
    label: texts.treeState.archived,
  },
  neutral: {
    fill: 'bg-surface-raised',
    mark: 'bg-text-muted',
    label: '',
  },
  jil: {
    fill: 'bg-jil-magenta-soft',
    mark: 'bg-jil-magenta',
    label: 'Juventud en línea',
  },
};

export type BadgeProps = {
  tone: BadgeTone;
  /** Overrides the state's own word, for counts such as "3 vencidos". */
  children?: ReactNode;
  /** Hidden when the badge sits in a row that already shows a status dot. */
  dot?: boolean;
  className?: string;
};

export function Badge({ tone, children, dot = true, className }: BadgeProps) {
  const { fill, mark, label } = tones[tone];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5',
        'font-sans text-xs font-semibold whitespace-nowrap text-text-primary',
        fill,
        className,
      )}
    >
      {dot ? (
        <span className={cn('size-1.5 shrink-0 rounded-full', mark)} aria-hidden="true" />
      ) : null}
      {children ?? label}
    </span>
  );
}
