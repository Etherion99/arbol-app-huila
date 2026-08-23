import { Card, ScreenTitle } from '@/components/ui/card';
import { Notice } from '@/components/ui/notice';
import { EmptyState, ErrorState, NoDataSourceState } from '@/components/ui/states';
import { texts } from '@/constants/texts';
import { FlaggedTreeCard } from '@/features/moderation/components/flagged-tree-card';
import { RegistrationReviewCard } from '@/features/moderation/components/registration-review-card';
import { getFlaggedTrees } from '@/features/moderation/queries';
import {
  getRegistrationReviewQueue,
  signFlagPhotos,
} from '@/features/moderation/registration-queries';

/**
 * D4 · Moderación: la cola de revisión y el archivado motivado.
 *
 * The screen holds two queues, and they answer different questions.
 *
 * The **registration review queue** is what the canvas has drawn since the
 * first version -- the cards reading «GPS difiere 240 m de la foto» and
 * «duplicado a <3 m». It had no data behind it until `registration_flags`
 * existed; now it does, and it is at the top because a doubtful registration
 * decays: the guardian who could explain it remembers this week and not in
 * three months.
 *
 * The **overdue growth logs** below are a different thing entirely. A tree
 * nobody has photographed in five months is not suspicious, it is neglected,
 * and what it needs is a coordinator getting in touch rather than a verdict.
 *
 * Nothing on either half was refused on the way in, and the intro says so.
 */
export default async function Page() {
  const [review, flagged] = await Promise.all([getRegistrationReviewQueue(), getFlaggedTrees()]);

  const photos = 'error' in review ? new Map<string, string>() : await signFlagPhotos(review.flags);

  return (
    <>
      <ScreenTitle
        suffix={'error' in flagged ? undefined : texts.moderation.flaggedSuffix(flagged.total)}
      >
        {texts.moderation.title}
      </ScreenTitle>

      <Notice tone="info">{texts.moderation.intro}</Notice>

      <ScreenTitle
        suffix={
          'error' in review ? undefined : texts.registrationReview.countSuffix(review.flags.length)
        }
      >
        {texts.registrationReview.title}
      </ScreenTitle>

      {'error' in review ? (
        <ErrorState />
      ) : review.flags.length === 0 ? (
        <Card>
          <EmptyState
            title={texts.registrationReview.emptyTitle}
            body={texts.registrationReview.emptyBody}
          />
        </Card>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {review.flags.map((flag) => (
              <li key={flag.flagId} className="flex">
                <RegistrationReviewCard
                  flag={flag}
                  photoUrl={flag.photoPath === null ? null : (photos.get(flag.photoPath) ?? null)}
                />
              </li>
            ))}
          </ul>
          <p className="font-sans text-xs text-text-secondary">{texts.registrationReview.note}</p>
        </>
      )}

      <ScreenTitle>{texts.moderation.overdueTitle}</ScreenTitle>

      {'error' in flagged ? (
        <ErrorState />
      ) : flagged.trees.length === 0 ? (
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

      {'error' in flagged || flagged.trees.length >= flagged.total ? null : (
        <p className="font-sans text-xs text-text-secondary">
          {texts.moderation.showingOldest(flagged.trees.length, flagged.total)}
        </p>
      )}

      <NoDataSourceState note={texts.moderation.historyNote} />
    </>
  );
}
