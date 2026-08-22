'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Select } from '@/components/ui/select';
import { texts } from '@/constants/texts';
import { ALL_MUNICIPALITIES, MUNICIPALITY_PARAM } from '@/features/statistics/params';
import type { MunicipalityOption } from '@/features/statistics/queries';
import { routes } from '@/lib/routes';

/**
 * The scope switch at the top right of D2.
 *
 * A Client Component only because it navigates on change. It holds no copy of
 * the figures and no state of its own: the chosen municipality is the URL, the
 * server re-renders, and the cards come back already filtered. That is what
 * keeps a bookmarked dashboard showing what it showed when it was bookmarked.
 *
 * The transition keeps the previous figures on screen while the new ones are
 * fetched, so the numbers never blink to empty and back.
 */
export function MunicipalityFilter({
  options,
  value,
}: {
  options: readonly MunicipalityOption[];
  /** The municipality currently in the URL, or undefined for the whole project. */
  value?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const selectOptions = [
    { value: ALL_MUNICIPALITIES, label: texts.dashboard.allMunicipalities },
    ...options.map((option) => ({
      value: option.municipalityId ?? ALL_MUNICIPALITIES,
      label: option.municipalityName ?? texts.common.noValue,
    })),
  ];

  return (
    <Select
      label={texts.dashboard.municipalityLabel}
      labelHidden
      // Suppressed: the "all municipalities" entry already is the neutral
      // choice, and a disabled placeholder above it would only be a second one.
      placeholder=""
      options={selectOptions}
      value={value ?? ALL_MUNICIPALITIES}
      aria-busy={pending}
      className="w-56"
      onChange={(event) => {
        const chosen = event.target.value;
        const href =
          chosen === ALL_MUNICIPALITIES
            ? routes.dashboard
            : `${routes.dashboard}?${MUNICIPALITY_PARAM}=${encodeURIComponent(chosen)}`;

        // `replace` and not `push`: switching scope is refining one view, not
        // stepping forward, and the back button should leave the panel rather
        // than walk the coordinator through every filter they tried.
        startTransition(() => router.replace(href));
      }}
    />
  );
}
