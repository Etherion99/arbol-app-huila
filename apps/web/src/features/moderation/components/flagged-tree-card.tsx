import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { texts } from '@/constants/texts';
import { ArchiveTreeDialog } from '@/features/moderation/components/archive-tree-dialog';
import type { FlaggedTree } from '@/features/moderation/queries';
import { routes } from '@/lib/routes';

/**
 * The tree glyph standing in for a photograph.
 *
 * The real thumbnail lives in a private storage bucket and is reachable only
 * through a signed URL, which this screen does not mint. A grey rectangle would
 * read as "this tree has no photo"; the project's own mark plainly reads as a
 * placeholder.
 */
function PhotoPlaceholder() {
  return (
    <div
      role="img"
      aria-label={texts.moderation.photoPlaceholderLabel}
      className="flex h-27 items-center justify-center rounded-md bg-surface-raised text-accent"
    >
      <svg
        viewBox="0 0 24 24"
        width="34"
        height="34"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M7 20h10M12 20v-8m0 0c-4 0-6-2.5-6-6 3.5 0 6 2 6 6zm0-2c0-4 2.5-6 6-6 0 3.5-2 6-6 6z" />
      </svg>
    </div>
  );
}

/** One flagged tree in the D4 grid. */
export function FlaggedTreeCard({ tree }: { tree: FlaggedTree }) {
  const treeName = `${tree.speciesName} · ${tree.code}`;

  return (
    <Card className="flex w-full flex-col gap-2.5 p-3.5">
      <PhotoPlaceholder />

      <div>
        <h2 className="font-subheading text-sm font-semibold text-text-primary">
          {tree.speciesName}
        </h2>
        {/* Earth brown rather than the state colour: it carries the warning and
            still clears AA on the card, which the overdue orange does not. */}
        <p className="mt-0.5 font-mono text-[11px] text-earth-brown">
          {texts.moderation.reasonOverdue(tree.monthsSinceLastEntry)}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-text-muted">{tree.code}</p>
        <p className="mt-1 font-sans text-xs text-text-secondary">
          {tree.guardianName
            ? texts.moderation.guardianLine(tree.guardianName)
            : texts.moderation.noGuardian}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-1">
        <Link
          href={routes.tree(tree.treeId)}
          className="inline-flex min-h-hit items-center font-sans text-sm text-text-link hover:text-text-link-hover"
        >
          {texts.moderation.viewAction}
        </Link>
        <ArchiveTreeDialog treeId={tree.treeId} treeName={treeName} />
      </div>
    </Card>
  );
}
