import { Card, CardHeading } from '@/components/ui/card';
import { texts } from '@/constants/texts';
import type { PlatformHealth } from '@/features/statistics/platform-queries';

/** Megabytes, one decimal, with the Colombian comma. */
function megabytes(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(1).replace('.', ',');
}

/**
 * The one block on the tablero that is about the platform rather than the
 * trees: how much of the storage allowance is gone, and whether the backup is
 * still running.
 *
 * ## Why the gauge is here and not only in an alert
 *
 * The database raises a `system_alerts` row the first time usage crosses 70 per
 * cent, and that is the thing that catches somebody's attention. But an alert
 * is noticed once and then lived with, and the question a coordinator actually
 * has in September is "how fast is it filling", which only a number they see
 * every week can answer. So the alert is the interruption and this is the
 * gauge, and they read the same figure.
 *
 * ## The bar is never the only channel
 *
 * The percentage is written beside it in words and figures, and the warning
 * state is said in a sentence rather than only shown as a colour. A coordinator
 * who does not separate amber from green still reads «queda poco espacio».
 */
export function PlatformCard({ health }: { health: PlatformHealth }) {
  if (!health.ok) {
    return (
      <Card className="flex flex-col gap-2 p-4.5">
        <CardHeading level={3}>{texts.platform.title}</CardHeading>
        <p role="status" className="font-sans text-sm text-text-secondary">
          {texts.platform.unknown}
        </p>
      </Card>
    );
  }

  const percent = Math.round(health.storage.usedRatio * 100);
  const isWarning = percent >= texts.platform.warnAtPercent;

  return (
    <Card className="flex flex-col gap-2.5 p-4.5">
      <CardHeading level={3}>{texts.platform.title}</CardHeading>

      <div>
        <p className="font-heading text-2xl font-extrabold text-text-primary">
          {texts.platform.storageValue(percent)}
        </p>
        <p className="mt-0.5 font-mono text-[11px] text-text-secondary">
          {texts.platform.storageDetail(
            megabytes(health.storage.bytesUsed),
            megabytes(health.storage.bytesQuota),
            health.storage.objectCount,
          )}
        </p>
      </div>

      {/* `aria-hidden`, because the figure above already says the number and a
          progress bar would announce it a second time. */}
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-border-subtle">
        <div
          className={isWarning ? 'h-full bg-accent-2' : 'h-full bg-accent'}
          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
        />
      </div>

      {isWarning ? (
        // Earth brown, not the orange of the bar: `accent-2` is 3.15:1 on this
        // card and this is a 12px sentence, which owes 4.5:1. `earth-brown` is
        // 6.01:1 and is already the panel's ink for "mira esto".
        <p role="status" className="font-sans text-xs text-earth-brown">
          {texts.platform.storageWarning}
        </p>
      ) : null}

      <p className="mt-1 font-sans text-xs text-text-secondary">
        {health.backup === null
          ? texts.platform.backupNever
          : health.backup.isStale
            ? texts.platform.backupStale(health.backup.hoursSinceSuccess ?? 0)
            : texts.platform.backupFresh(health.backup.hoursSinceSuccess ?? 0)}
      </p>
    </Card>
  );
}
