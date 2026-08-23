'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import type { FlaggedRegistration } from '@arbolapp/core';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { texts } from '@/constants/texts';
import { ArchiveTreeDialog } from '@/features/moderation/components/archive-tree-dialog';
import { resolveRegistrationFlag } from '@/features/moderation/actions';
import { routes } from '@/lib/routes';

export type RegistrationReviewCardProps = {
  flag: FlaggedRegistration;
  /** Signed by the server component; absent when the photograph never arrived. */
  photoUrl: string | null;
};

/**
 * One flagged registration, and the decision a coordinator makes about it.
 *
 * ## The order of what it says
 *
 * The photograph first, because it is the evidence and because the judgement is
 * mostly "does this look like a tree somebody stood in front of". Then what was
 * measured, in words and in metres. Then who registered it and where, so a
 * coordinator who knows the veredas can recognise an honest reading before they
 * ever look at the number.
 *
 * ## Why «Descartar» is the primary action
 *
 * Because it is the usual answer. Under canopy, on a slope, in the rain, the
 * GPS drifts; a photograph with no coordinate at all usually means an old
 * handset or a cold start. Making the innocent verdict the easy one is not a
 * courtesy, it is what keeps the queue from being cleared by whichever button
 * happens to be under the cursor -- and the consequence of a wrong dismissal is
 * a flag that can be raised again, while the consequence of a wrong
 * confirmation lands on a volunteer.
 *
 * Confirming does not archive the tree. The archive dialog is here, beside it,
 * because that is a second decision and it takes a written motive the guardian
 * will read.
 */
export function RegistrationReviewCard({ flag, photoUrl }: RegistrationReviewCardProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const treeName = `${flag.speciesName} · ${flag.code}`;
  const place = [flag.villageName, flag.municipalityName].filter(Boolean).join(' · ');

  function resolve(resolution: 'confirmed' | 'dismissed') {
    const formData = new FormData();
    formData.set('flagId', flag.flagId);
    formData.set('resolution', resolution);

    startTransition(async () => {
      const result = await resolveRegistrationFlag(formData);
      // Kept on screen rather than swallowed. A card that quietly stays put
      // after a click reads as a slow network, and the coordinator clicks
      // again.
      setError(result.error);
    });
  }

  return (
    <Card className="flex w-full flex-col gap-2.5 p-3.5">
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={texts.registrationReview.photoAlt(flag.speciesName)}
          width={320}
          height={200}
          unoptimized
          className="h-40 w-full rounded-md object-cover"
        />
      ) : (
        <div
          role="img"
          aria-label={texts.registrationReview.photoMissing}
          className="flex h-40 items-center justify-center rounded-md bg-surface-raised font-sans text-xs text-text-secondary"
        >
          {texts.registrationReview.photoMissing}
        </div>
      )}

      <div>
        <h3 className="font-subheading text-sm font-semibold text-text-primary">
          {flag.speciesName}
        </h3>

        {/* Earth brown rather than the state orange: this is 11 point text and
            `#F26522` reads 3.15:1 on the card, under the 4.5:1 it owes.
            `#8B572A` is 6.01:1 and is already the app's ink for "revísalo". */}
        <p className="mt-0.5 font-mono text-[11px] text-earth-brown">
          {texts.registrationReview.reason[flag.reason]}
          {flag.distanceMetres === null
            ? ''
            : ` · ${texts.registrationReview.distance(flag.distanceMetres)}`}
        </p>

        <p className="mt-0.5 font-mono text-[11px] text-text-secondary">{flag.code}</p>

        <p className="mt-1 font-sans text-xs text-text-secondary">
          {flag.guardianDisplayName
            ? texts.moderation.guardianLine(flag.guardianDisplayName)
            : texts.moderation.noGuardian}
          {place === '' ? '' : ` · ${place}`}
        </p>

        {/* The other half of a duplicate is a link, not a code printed as
            text: judging "¿son el mismo árbol?" means looking at both. */}
        {flag.relatedTreeId !== null && flag.relatedTreeCode !== null ? (
          <p className="mt-1 font-sans text-xs text-text-secondary">
            {texts.registrationReview.relatedLabel}{' '}
            <Link
              href={routes.tree(flag.relatedTreeId)}
              className="font-mono text-text-link hover:text-text-link-hover"
            >
              {flag.relatedTreeCode}
            </Link>
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="font-sans text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={() => resolve('dismissed')}
          disabled={pending}
          className="flex-1"
        >
          {texts.registrationReview.dismiss}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => resolve('confirmed')}
          disabled={pending}
          className="flex-1"
        >
          {texts.registrationReview.confirm}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Link
          href={routes.tree(flag.treeId)}
          className="inline-flex min-h-hit items-center font-sans text-sm text-text-link hover:text-text-link-hover"
        >
          {texts.moderation.viewAction}
        </Link>
        <ArchiveTreeDialog treeId={flag.treeId} treeName={treeName} />
      </div>
    </Card>
  );
}
