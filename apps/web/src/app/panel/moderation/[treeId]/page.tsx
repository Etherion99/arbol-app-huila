import Link from 'next/link';

import type { ReactNode } from 'react';

import { LoadError } from '@/components/panel/load-error';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeading, ScreenTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { EmptyState, NoDataSourceState } from '@/components/ui/states';
import { texts } from '@/constants/texts';
import {
  getArchivedGuardian,
  getGuardianCandidates,
  getLogbookSummary,
  getTreeDetail,
} from '@/features/trees/queries';
import { ReassignPanel } from '@/features/trees/components/reassign-panel';
import { formatCoordinates, formatDate, formatShortDate } from '@/lib/format';
import { routes } from '@/lib/routes';

/**
 * D6 · Detalle de árbol (admin) y reasignación.
 *
 * ## What the canvas draws that the database cannot answer
 *
 * Two blocks on this screen have no source behind them, and both say so rather
 * than showing something plausible:
 *
 * - **Historial de moderación.** There is no moderation table. Nothing records
 *   that a photograph was reviewed or that a coordinator looked at a tree, and
 *   inventing one is a schema change, which goes by versioned migration and is
 *   not interface work.
 * - **The mini map.** There is no Maps key in this environment and the web map
 *   is a later phase, so the canvas's own placeholder is kept as a placeholder.
 *
 * The "guardiana anterior desactivada el 3 feb 2026" line, on the other hand,
 * is real. `public_users` hides an archived account, so a tree that still
 * points at a guardian the view will not return is exactly the case the canvas
 * drew, and `user_directory` can still say when it happened and why.
 */
export default async function Page({ params }: PageProps<'/panel/moderation/[treeId]'>) {
  const { treeId } = await params;

  const [tree, logbook, candidates] = await Promise.all([
    getTreeDetail(treeId),
    getLogbookSummary(treeId),
    getGuardianCandidates(),
  ]);

  if (!tree.ok) {
    return (
      <>
        <BackLink />
        <LoadError />
      </>
    );
  }

  if (!tree.value) {
    return (
      <>
        <BackLink />
        <ScreenTitle>{texts.treeDetail.notFoundTitle}</ScreenTitle>
        <Card>
          <EmptyState title={texts.treeDetail.notFoundTitle} body={texts.treeDetail.notFoundBody} />
        </Card>
      </>
    );
  }

  const detail = tree.value;

  // A guardian the tree points at but `public_users` does not return is an
  // archived account. Only then is the directory asked, and only for the three
  // columns the notice needs -- never the email.
  const formerGuardian =
    detail.guardianId && !detail.guardianDisplayName
      ? await getArchivedGuardian(detail.guardianId)
      : null;

  const former = formerGuardian?.ok ? formerGuardian.value : null;
  const coordinates = formatCoordinates(detail.lat, detail.lng);
  const lastEntry = logbook.ok ? formatShortDate(logbook.value.lastEntryAt) : null;

  return (
    <div className="flex flex-1 flex-col gap-5 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3.5">
        <BackLink />

        <div className="flex flex-wrap items-center gap-3">
          <ScreenTitle suffix={detail.code}>{detail.speciesName}</ScreenTitle>
          {detail.guardianId && detail.guardianDisplayName ? (
            <Badge tone={detail.trackingStatus} />
          ) : (
            <Badge tone="archived">{texts.treeDetail.noGuardian}</Badge>
          )}
        </div>

        {!detail.guardianId ? (
          <Notice tone="neutral">{texts.treeDetail.noGuardianNotice}</Notice>
        ) : !detail.guardianDisplayName ? (
          <Notice tone="neutral">
            {former && former.archivedAt ? (
              <>
                {texts.treeDetail.guardianDeactivatedNotice(
                  former.fullName,
                  formatDate(former.archivedAt) ?? texts.common.noValue,
                )}
                {former.archiveReason ? (
                  <span className="mt-1 block text-text-secondary">
                    {texts.treeDetail.guardianDeactivatedReason(former.archiveReason)}
                  </span>
                ) : null}
              </>
            ) : (
              texts.treeDetail.noGuardianNotice
            )}
          </Notice>
        ) : null}

        <div className="grid gap-3.5 md:grid-cols-2">
          <Card className="p-3.5">
            <CardHeading>{texts.treeDetail.dataHeader}</CardHeading>
            <dl className="mt-2.5 flex flex-col gap-1.5 font-sans text-[13px]">
              <DataRow label={texts.treeDetail.plantedAt} mono>
                {formatDate(detail.plantedAt) ?? texts.common.noValue}
              </DataRow>
              <DataRow label={texts.treeDetail.location} mono>
                {coordinates ?? texts.common.noValue}
              </DataRow>
              <DataRow label={texts.treeDetail.village}>
                {detail.villageName ?? texts.common.noValue}
              </DataRow>
              <DataRow label={texts.treeDetail.guardian}>
                {detail.guardianDisplayName ?? texts.treeDetail.noGuardian}
              </DataRow>
              <DataRow label={texts.treeDetail.logbook} mono>
                {!logbook.ok
                  ? texts.common.noValue
                  : logbook.value.entryCount === 0 || !lastEntry
                    ? texts.treeDetail.logbookEmpty
                    : texts.treeDetail.logbookEntries(logbook.value.entryCount, lastEntry)}
              </DataRow>
            </dl>
          </Card>

          {/* The canvas's mini map, kept as the placeholder it is. There is no
              Maps key here and the web map belongs to a later phase, so a real
              map would be a promise this screen cannot keep. */}
          <Card className="relative min-h-[150px] overflow-hidden">
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,var(--surface-raised),var(--border-subtle))]"
            />
            <span
              aria-hidden="true"
              className="absolute top-1/2 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-state-archived"
            />
            <span className="absolute bottom-2 left-2.5 font-mono text-[10px] text-text-muted">
              {texts.treeDetail.miniMap}
            </span>
            <span className="absolute right-2.5 bottom-2 font-sans text-[10px] text-text-muted">
              {texts.treeDetail.miniMapNote}
            </span>
          </Card>
        </div>

        <Card className="flex flex-1 flex-col gap-2.5 p-3.5">
          <CardHeading>{texts.treeDetail.moderationHistory}</CardHeading>
          <NoDataSourceState note={texts.treeDetail.moderationHistoryNote} />
        </Card>
      </div>

      <ReassignPanel
        treeId={detail.treeId}
        currentGuardianId={detail.guardianId}
        candidates={candidates.ok ? candidates.value : null}
      />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href={routes.moderation}
      className="inline-flex min-h-hit items-center font-sans text-[13px] text-text-link hover:text-text-link-hover"
    >
      ← {texts.treeDetail.back}
    </Link>
  );
}

/** One "etiqueta … valor" line of the DATOS card. */
function DataRow({
  label,
  mono = false,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd
        className={mono ? 'text-right font-mono text-text-primary' : 'text-right text-text-primary'}
      >
        {children}
      </dd>
    </div>
  );
}
