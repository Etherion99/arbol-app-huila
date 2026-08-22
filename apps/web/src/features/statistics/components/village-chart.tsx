import { CardHeading } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { texts } from '@/constants/texts';
import { formatCount } from '@/features/statistics/format';
import type { VillageCount } from '@/features/statistics/queries';

/** How many villages get a bar of their own before the rest are gathered up. */
const NAMED_BARS = 4;

type Bar = {
  key: string;
  label: string;
  value: number;
  /** The gathered remainder, painted darker so it does not read as a village. */
  isOther: boolean;
};

/**
 * The four largest villages, plus one bar for everything else.
 *
 * The remainder is summed rather than dropped: a chart whose bars do not add up
 * to the figure on the SEMBRADOS card is a chart the coordinator stops
 * trusting. It only appears when there is actually something left over.
 */
export function toBars(counts: readonly VillageCount[]): Bar[] {
  const named = counts.slice(0, NAMED_BARS);
  const rest = counts.slice(NAMED_BARS);
  const restTotal = rest.reduce((total, entry) => total + entry.plantedTotal, 0);

  const bars: Bar[] = named.map((entry, index) => ({
    key: entry.villageId ?? `unnamed-${index}`,
    label: entry.villageName ?? texts.dashboard.unknownVillage,
    value: entry.plantedTotal,
    isOther: false,
  }));

  if (restTotal > 0) {
    bars.push({
      key: 'other',
      label: texts.dashboard.otherVillages,
      value: restTotal,
      isOther: true,
    });
  }

  return bars;
}

/**
 * Trees planted per village, as horizontal bars.
 *
 * Every bar is scaled against the largest one, so the shape of the chart is
 * about how the villages compare with each other -- which is the question the
 * coordinator is asking here. The bar itself is hidden from assistive
 * technology: it repeats the count printed beside it, and a screen reader
 * announcing a decorative rectangle adds nothing.
 */
export function VillageChart({
  counts,
  municipalityName,
}: {
  counts: readonly VillageCount[];
  /** Named in the heading when the dashboard is scoped to one municipality. */
  municipalityName?: string;
}) {
  const bars = toBars(counts);
  const largest = bars.reduce((max, bar) => Math.max(max, bar.value), 0);

  return (
    <>
      <CardHeading>
        {municipalityName
          ? texts.dashboard.byVillageIn(municipalityName)
          : texts.dashboard.byVillage}
      </CardHeading>

      {bars.length === 0 ? (
        <EmptyState className="flex-1 justify-center" body={texts.dashboard.villageEmpty} />
      ) : (
        <ul className="mt-2.5 flex flex-1 flex-col justify-center gap-3">
          {bars.map((bar) => (
            <li key={bar.key} className="flex items-center gap-3">
              <span className="w-[110px] shrink-0 truncate font-sans text-[13px] text-text-secondary">
                {bar.label}
              </span>
              {/* `border-subtle` and not the canvas's `surface-overlay`: that
                  token is pure white in the 2026 palette, so the track would be
                  invisible on the white card it sits on. */}
              <span
                aria-hidden="true"
                className="h-3.5 flex-1 overflow-hidden rounded-full bg-border-subtle"
              >
                <span
                  className={bar.isOther ? 'block h-full bg-green-950' : 'block h-full bg-accent'}
                  style={{ width: largest > 0 ? `${(bar.value / largest) * 100}%` : '0%' }}
                />
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-xs text-text-primary">
                {formatCount(bar.value)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
