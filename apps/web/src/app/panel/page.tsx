import { Card, ScreenTitle } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { texts } from '@/constants/texts';
import { BlockError } from '@/features/statistics/components/block-error';
import { MunicipalityFilter } from '@/features/statistics/components/municipality-filter';
import { SpeciesList } from '@/features/statistics/components/species-list';
import { VillageChart } from '@/features/statistics/components/village-chart';
import { formatCount, formatRate } from '@/features/statistics/format';
import { MUNICIPALITY_PARAM } from '@/features/statistics/params';
import {
  getMunicipalityOptions,
  getOverview,
  getSpeciesCounts,
  getVillageCounts,
} from '@/features/statistics/queries';

/**
 * D2 · Tablero de estadísticas.
 *
 * Four headline figures over two charts, all of them read from the aggregate
 * views the database already publishes. Nothing here computes a statistic: the
 * same views back the PRAE export, so the tablero and the report cannot
 * disagree about how many trees are alive.
 *
 * ## What the canvas draws and this screen does not
 *
 * - **"+28 este mes"** under SEMBRADOS. There is no time series anywhere in the
 *   schema; the views are snapshots of the present. The card carries no
 *   footnote rather than a made up delta.
 * - **"17 archivados"** under VIVOS. `tree_overview` filters archived trees out
 *   before counting, so no statistics view can reach them. Only the dead are
 *   shown, and they are real.
 * - **The "2026" filter.** No aggregate takes a year, so the chip is absent
 *   instead of present and inert.
 *
 * Each of those is a schema change, and a schema change goes by versioned
 * migration rather than by a screen inventing a number that looks plausible.
 *
 * ## Why the municipality filter does not reach the species card
 *
 * `statistics_by_species` groups by species and by nothing else. Rather than
 * leave the card looking filtered when it is not, it keeps counting the whole
 * project and says so in a line under the list.
 */
export default async function DashboardPage({ searchParams }: PageProps<'/panel'>) {
  const params = await searchParams;
  const requested =
    typeof params[MUNICIPALITY_PARAM] === 'string' ? params[MUNICIPALITY_PARAM] : undefined;

  const municipalities = await getMunicipalityOptions();

  // A municipality typed into the URL by hand is dropped rather than used to
  // query, so a stale bookmark shows the whole project instead of four zeroes.
  const municipality =
    municipalities.ok && requested
      ? municipalities.data.find((option) => option.municipalityId === requested)
      : undefined;
  const municipalityId = municipality?.municipalityId ?? undefined;

  const [overview, villages, species] = await Promise.all([
    getOverview(municipalityId),
    getVillageCounts(municipalityId),
    getSpeciesCounts(),
  ]);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ScreenTitle>{texts.dashboard.title}</ScreenTitle>
        {municipalities.ok && municipalities.data.length > 0 ? (
          <MunicipalityFilter options={municipalities.data} value={municipalityId} />
        ) : null}
      </div>

      {overview.ok ? (
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={texts.dashboard.metrics.planted}
            value={formatCount(overview.data.plantedTotal)}
          />
          <StatCard
            label={texts.dashboard.metrics.alive}
            value={formatCount(overview.data.aliveTotal)}
            emphasis
            footnote={texts.dashboard.deadCount(overview.data.deadTotal)}
          />
          <StatCard
            label={texts.dashboard.metrics.survival}
            value={formatRate(overview.data.survivalRate)}
            footnote={texts.dashboard.survivalBase(overview.data.plantedTotal)}
          />
          <StatCard
            label={texts.dashboard.metrics.punctuality}
            value={formatRate(overview.data.onTimeRate)}
            footnote={
              // Earth brown rather than muted: this is the figure the
              // coordinator is meant to act on.
              <span className="text-earth-brown">
                {texts.dashboard.overdueCount(overview.data.overdueTotal)}
              </span>
            }
          />
        </div>
      ) : (
        <BlockError />
      )}

      <div className="grid min-h-0 flex-1 gap-3.5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="flex flex-col p-4.5">
          {villages.ok ? (
            <VillageChart
              counts={villages.data}
              municipalityName={municipality?.municipalityName ?? undefined}
            />
          ) : (
            <BlockError className="m-auto" />
          )}
        </Card>

        <Card className="flex flex-col gap-2.5 p-4.5">
          {species.ok ? (
            <SpeciesList counts={species.data} wholeProjectNote={municipalityId !== undefined} />
          ) : (
            <BlockError className="m-auto" />
          )}
        </Card>
      </div>
    </>
  );
}
