import { Card, ScreenTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { EmptyState, ErrorState, NoDataSourceState } from '@/components/ui/states';
import { texts } from '@/constants/texts';
import { FlaggedTreeCard } from '@/features/moderation/components/flagged-tree-card';
import { getFlaggedTrees } from '@/features/moderation/queries';

/**
 * D4 · Moderación con archivado motivado.
 *
 * What the canvas shows and what the database can answer are not the same set.
 * The cards read "GPS difiere 240 m de la foto" and "duplicado a <3 m"; nothing
 * compares a declared coordinate against photo EXIF and nothing detects two
 * trees planted within three metres, and there is no flag column and no
 * moderation queue table to read either. Adding one is a schema change, which
 * goes by versioned migration.
 *
 * So the grid shows the one case with a real signal behind it -- an overdue
 * growth log -- the intro says so plainly, and the moderation history the
 * canvas draws is marked as having no source rather than filled with plausible
 * rows. Nothing here pretends to have data it does not have.
 */
export default async function Page() {
  const flagged = await getFlaggedTrees();

  if ('error' in flagged) {
    return (
      <>
        <ScreenTitle>{texts.moderation.title}</ScreenTitle>
        <ErrorState />
      </>
    );
  }

  return (
    <>
      <ScreenTitle suffix={texts.moderation.flaggedSuffix(flagged.total)}>
        {texts.moderation.title}
      </ScreenTitle>

      <Notice tone="info">{texts.moderation.intro}</Notice>

      {flagged.trees.length === 0 ? (
        <Card>
          <EmptyState title={texts.moderation.emptyTitle} body={texts.moderation.emptyBody} />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
          {flagged.trees.map((tree) => (
            <li key={tree.treeId} className="flex">
              <FlaggedTreeCard tree={tree} />
            </li>
          ))}
        </ul>
      )}

      {flagged.trees.length < flagged.total ? (
        <p className="font-sans text-xs text-text-muted">
          {texts.moderation.showingOldest(flagged.trees.length, flagged.total)}
        </p>
      ) : null}

      <NoDataSourceState note={texts.moderation.historyNote} />
    </>
  );
}
