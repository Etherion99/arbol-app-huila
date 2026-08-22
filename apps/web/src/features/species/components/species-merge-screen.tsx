'use client';

import { useState, useTransition } from 'react';

import type { Uuid } from '@arbolapp/core';

import { Button } from '@/components/ui/button';
import { Card, CardHeading, ScreenTitle } from '@/components/ui/card';
import { CheckboxRow, RadioGroup, RadioRow } from '@/components/ui/choice';
import { TextField } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { EmptyState } from '@/components/ui/states';
import { LoadError } from '@/components/panel/load-error';
import { texts } from '@/constants/texts';
import { mergeSpecies, revertSpeciesMerges, type MergeResult } from '@/features/species/actions';
import type { SingleOccurrenceSpecies, SpeciesVariant } from '@/features/species/queries';

/**
 * The radio value standing for a surviving name that is none of the merged
 * ones. `merge_species()` takes a free text name on purpose -- "cinco
 * mandarinos y seis mandarinas pueden acabar como once árboles llamados
 * «Árboles de mandarina»" -- and a species identifier is a uuid, so no real
 * option can collide with this string.
 */
const CUSTOM_NAME = 'custom';

type Outcome =
  | { kind: 'merged'; mergeIds: Uuid[]; variantCount: number; officialName: string }
  | { kind: 'reverted' }
  | { kind: 'error'; message: string };

export type SpeciesMergeScreenProps = {
  variants: SpeciesVariant[] | null;
  singleOccurrence: SingleOccurrenceSpecies[] | null;
};

/**
 * D5 · Fusión de especies.
 *
 * The screen is only the interface. Which trees move, what the audit row says
 * and whether the caller is allowed to do any of it are decided by
 * `merge_species()` in the database, so nothing here can drift from what
 * actually happened.
 *
 * State is three pieces of interaction -- what is ticked, which name wins, and
 * what the last call answered -- and everything else is worked out while
 * rendering. No effect derives state from another piece of state.
 */
export function SpeciesMergeScreen({ variants, singleOccurrence }: SpeciesMergeScreenProps) {
  const [selectedIds, setSelectedIds] = useState<readonly Uuid[]>([]);
  const [officialChoice, setOfficialChoice] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [pending, startTransition] = useTransition();

  if (!variants) {
    return (
      <>
        <ScreenTitle>{texts.species.title}</ScreenTitle>
        <LoadError />
      </>
    );
  }

  // Derived during the render, never stored: a stored copy is what goes stale
  // the first time a merge changes the list underneath it.
  const selected = variants.filter((variant) => selectedIds.includes(variant.speciesId));
  const selectedTreeTotal = selected.reduce((total, variant) => total + variant.treeCount, 0);
  const canMerge = selected.length >= 2;

  const chosenVariant =
    officialChoice === null || officialChoice === CUSTOM_NAME
      ? null
      : (selected.find((variant) => variant.speciesId === officialChoice) ?? null);

  const usingCustomName = officialChoice === CUSTOM_NAME;
  const trimmedCustomName = customName.trim();

  // The name the button offers to merge into: the ticked one, the typed one, or
  // nothing yet.
  const officialName = usingCustomName ? trimmedCustomName : (chosenVariant?.canonicalName ?? '');
  const readyToMerge =
    canMerge && officialName !== '' && (usingCustomName || chosenVariant !== null);

  function toggleVariant(speciesId: Uuid, checked: boolean) {
    setOutcome(null);
    setSelectedIds((current) =>
      checked ? [...current, speciesId] : current.filter((id) => id !== speciesId),
    );

    // A name that is no longer among the ticked variants cannot stay chosen.
    if (!checked && officialChoice === speciesId) setOfficialChoice(null);
  }

  function runMerge() {
    // The target keeps its row and the others fold into it. When the surviving
    // name is typed rather than picked, the first ticked variant is the one
    // that survives and gets renamed -- the function renames the target, so
    // some ticked variant has to be it.
    const target = chosenVariant ?? selected[0];
    if (!target) return;

    const sourceIds = selected
      .map((variant) => variant.speciesId)
      .filter((id) => id !== target.speciesId);

    startTransition(async () => {
      const result: MergeResult = await mergeSpecies({
        sourceIds,
        targetId: target.speciesId,
        newCanonicalName: usingCustomName ? trimmedCustomName : null,
      });

      if (!result.ok) {
        setOutcome({ kind: 'error', message: result.error });
        return;
      }

      setOutcome({
        kind: 'merged',
        mergeIds: result.mergeIds,
        variantCount: result.variantCount,
        officialName,
      });
      setSelectedIds([]);
      setOfficialChoice(null);
      setCustomName('');
    });
  }

  function runRevert(mergeIds: Uuid[]) {
    startTransition(async () => {
      const result = await revertSpeciesMerges(mergeIds);

      setOutcome(result.ok ? { kind: 'reverted' } : { kind: 'error', message: result.error });
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <ScreenTitle suffix={texts.species.countSuffix(variants.length)}>
          {texts.species.title}
        </ScreenTitle>
        <p className="max-w-[640px] font-sans text-[13px] leading-relaxed text-text-secondary">
          {texts.species.intro}
        </p>

        {outcome ? (
          <OutcomeNotice outcome={outcome} pending={pending} onRevert={runRevert} />
        ) : null}

        {variants.length === 0 ? (
          <Card>
            <EmptyState body={texts.species.variantsEmpty} />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <fieldset>
              <legend className="sr-only">{texts.species.variantsLegend}</legend>
              <ul className="flex flex-col">
                {variants.map((variant) => (
                  <li
                    key={variant.speciesId}
                    className="border-b border-border-subtle last:border-b-0"
                  >
                    <CheckboxRow
                      checked={selectedIds.includes(variant.speciesId)}
                      onCheckedChange={(checked) => toggleVariant(variant.speciesId, checked)}
                      disabled={pending}
                      meta={texts.species.treeCount(variant.treeCount)}
                    >
                      {variant.canonicalName}
                    </CheckboxRow>
                  </li>
                ))}
              </ul>
            </fieldset>
          </Card>
        )}

        {variants.length > 0 && !canMerge ? (
          <p className="font-sans text-xs text-text-muted">{texts.species.selectHint}</p>
        ) : null}

        {singleOccurrence === null ? (
          <LoadError />
        ) : singleOccurrence.length > 0 ? (
          <Notice tone="warning">
            {texts.species.singleOccurrenceTitle}{' '}
            <b>{singleOccurrence.map((species) => species.speciesName).join(', ')}</b> —{' '}
            {texts.species.singleOccurrenceHint}
          </Notice>
        ) : null}
      </div>

      {canMerge ? (
        <Card className="flex w-full shrink-0 flex-col gap-3.5 p-5 lg:w-[380px]">
          <CardHeading>{texts.species.mergeHeader(selected.length, selectedTreeTotal)}</CardHeading>

          <p className="font-sans text-sm text-text-secondary">{texts.species.chooseOfficial}</p>

          <RadioGroup
            value={officialChoice}
            onValueChange={(value: string | null) => setOfficialChoice(value)}
            aria-label={texts.species.chooseOfficial}
            disabled={pending}
            className="flex flex-col gap-2"
          >
            {selected.map((variant) => (
              <RadioRow
                key={variant.speciesId}
                value={variant.speciesId}
                selected={officialChoice === variant.speciesId}
                meta={String(variant.treeCount)}
              >
                {variant.canonicalName}
              </RadioRow>
            ))}

            <RadioRow value={CUSTOM_NAME} selected={usingCustomName}>
              {texts.species.customNameOption}
            </RadioRow>
          </RadioGroup>

          {usingCustomName ? (
            <TextField
              label={texts.species.customNameLabel}
              placeholder={texts.species.customNamePlaceholder}
              hint={texts.species.customNameHint}
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              disabled={pending}
            />
          ) : null}

          <p className="font-sans text-xs leading-relaxed text-text-muted">
            {texts.species.rawTextNotice}
          </p>

          <Button size="lg" block disabled={!readyToMerge || pending} onClick={runMerge}>
            {pending
              ? texts.species.merging
              : texts.species.mergeInto(officialName || texts.common.noValue)}
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

/** What the last call answered, with the undo when there is one to offer. */
function OutcomeNotice({
  outcome,
  pending,
  onRevert,
}: {
  outcome: Outcome;
  pending: boolean;
  onRevert: (mergeIds: Uuid[]) => void;
}) {
  if (outcome.kind === 'error') {
    return (
      <Notice tone="warning">
        <span role="alert">{outcome.message}</span>
      </Notice>
    );
  }

  if (outcome.kind === 'reverted') {
    return (
      <Notice tone="info">
        <span role="status">{texts.species.reverted}</span>
      </Notice>
    );
  }

  return (
    <Notice tone="info">
      <div className="flex flex-wrap items-center gap-3">
        <span role="status">
          {texts.species.merged(outcome.variantCount, outcome.officialName)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending || outcome.mergeIds.length === 0}
          onClick={() => onRevert(outcome.mergeIds)}
        >
          {pending ? texts.species.reverting : texts.species.undo}
        </Button>
      </div>
    </Notice>
  );
}
