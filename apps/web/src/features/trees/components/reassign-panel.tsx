'use client';

import { useState, useTransition } from 'react';

import type { Uuid } from '@arbolapp/core';

import { LoadError } from '@/components/panel/load-error';
import { Button } from '@/components/ui/button';
import { Card, CardHeading } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { SearchInput } from '@/components/ui/search-input';
import { texts } from '@/constants/texts';
import { reassignGuardian } from '@/features/trees/actions';
import type { GuardianCandidate } from '@/features/trees/queries';
import { cn } from '@/lib/utils';

/** Accent-insensitive, so "Yesid" finds "Yésid" and the other way round. */
function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-CO');
}

export type ReassignPanelProps = {
  treeId: Uuid;
  currentGuardianId: Uuid | null;
  candidates: GuardianCandidate[] | null;
};

/**
 * The right-hand column of D6: search a guardian, pick one, hand the tree over.
 *
 * The filtering is done while rendering rather than in an effect. A `useEffect`
 * that copies the query into a second piece of state would render the old list
 * once on every keystroke, which on a list this size is visible.
 */
export function ReassignPanel({ treeId, currentGuardianId, candidates }: ReassignPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<Uuid | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!candidates) {
    return (
      <Card className="flex w-full shrink-0 flex-col gap-3 p-5 lg:w-[380px]">
        <CardHeading>{texts.treeDetail.reassignHeader}</CardHeading>
        <LoadError />
      </Card>
    );
  }

  const needle = foldForSearch(query.trim());
  const visible = candidates.filter((candidate) => {
    if (candidate.userId === currentGuardianId) return false;
    if (needle === '') return true;
    return foldForSearch(candidate.fullName).includes(needle);
  });

  const selected = visible.find((candidate) => candidate.userId === selectedId) ?? null;

  function reassign(candidate: GuardianCandidate) {
    startTransition(async () => {
      const outcome = await reassignGuardian({ treeId, guardianId: candidate.userId });

      setResult(
        outcome.ok
          ? { ok: true, message: texts.treeDetail.reassigned(candidate.fullName) }
          : { ok: false, message: outcome.error },
      );

      if (outcome.ok) setSelectedId(null);
    });
  }

  return (
    <Card className="flex w-full shrink-0 flex-col gap-3 p-5 lg:w-[380px]">
      <CardHeading>{texts.treeDetail.reassignHeader}</CardHeading>

      <SearchInput
        label={texts.treeDetail.reassignSearch}
        placeholder={texts.treeDetail.reassignSearch}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        disabled={pending}
      />

      {result ? (
        <Notice tone={result.ok ? 'info' : 'warning'}>
          <span role={result.ok ? 'status' : 'alert'}>{result.message}</span>
        </Notice>
      ) : null}

      {visible.length === 0 ? (
        <p className="font-sans text-[13px] text-text-secondary">
          {texts.treeDetail.candidatesEmpty}
        </p>
      ) : (
        <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
          {visible.map((candidate) => {
            const isSelected = candidate.userId === selectedId;

            return (
              <li key={candidate.userId}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  disabled={pending}
                  onClick={() => setSelectedId(isSelected ? null : candidate.userId)}
                  className={cn(
                    'flex min-h-hit w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left',
                    'transition-colors outline-none focus-visible:ring-3 focus-visible:ring-border-focus/50',
                    'disabled:pointer-events-none disabled:opacity-45',
                    isSelected
                      ? 'border-[1.5px] border-accent bg-accent-soft'
                      : 'border-border-strong bg-surface-raised hover:bg-surface-card',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-full',
                      'bg-surface-overlay font-sans text-xs font-bold text-accent',
                    )}
                  >
                    {candidate.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-sans text-sm font-semibold text-text-primary">
                      {candidate.fullName}
                    </span>
                    <span className="block truncate font-sans text-[11px] text-text-muted">
                      {describeLoad(candidate)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="font-sans text-xs leading-relaxed text-text-muted">
        {texts.treeDetail.reassignNotice}
      </p>

      <Button
        block
        disabled={selected === null || pending}
        onClick={() => selected && reassign(selected)}
      >
        {pending
          ? texts.treeDetail.reassigning
          : texts.treeDetail.reassignTo(selected?.fullName ?? texts.common.noValue)}
      </Button>
    </Card>
  );
}

/** "Docente · 12 árboles, todos al día", from the figures that actually exist. */
function describeLoad(candidate: GuardianCandidate): string {
  const load =
    candidate.pendingCount === 0
      ? `${texts.treeDetail.candidateTrees(candidate.treeCount)}, ${texts.treeDetail.candidateAllUpToDate}`
      : `${texts.treeDetail.candidateTrees(candidate.treeCount)}, ${texts.treeDetail.candidatePending(candidate.pendingCount)}`;

  return candidate.institution ? `${candidate.institution} · ${load}` : load;
}
