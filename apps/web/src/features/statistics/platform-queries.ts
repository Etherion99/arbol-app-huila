import 'server-only';

import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/**
 * The health of the platform itself, rather than of the trees.
 *
 * Two numbers a coordinator has no other way to see, and both of them are the
 * kind that only matter before they become a problem.
 *
 * **Storage.** The free plan gives one gigabyte for the year. The database
 * raises a `system_alerts` row the first time usage crosses 70, 85 and 95 per
 * cent, and `check_storage_quota()` runs daily. This is the same figure on the
 * screen the coordinator already opens, so the alert is not the only place it
 * appears -- an alert is a thing you notice once, and a gauge is a thing you
 * watch.
 *
 * **Backups.** `backup_health()` says when the last one finished. Its whole
 * purpose is to make a scheduled job that quietly stopped running visible
 * before the day somebody needs to restore.
 */

export type StorageUsage = {
  bytesUsed: number;
  bytesQuota: number;
  objectCount: number;
  usedRatio: number;
};

export type BackupHealth = {
  lastSuccessAt: string | null;
  hoursSinceSuccess: number | null;
  isStale: boolean;
  lastError: string | null;
};

/** Whether the platform card can be drawn at all, or has to say it does not know. */
export type PlatformHealth =
  | { ok: true; storage: StorageUsage; backup: BackupHealth | null }
  | { ok: false };

/** `numeric` arrives as a string, and a null must not become a confident zero. */
function toNumber(value: number | string | null): number | null {
  if (value === null) return null;
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const getPlatformHealth = cache(async (): Promise<PlatformHealth> => {
  const supabase = await createClient();

  const [usage, backup] = await Promise.all([
    supabase.rpc('storage_usage'),
    supabase.rpc('backup_health'),
  ]);

  if (usage.error || !usage.data) return { ok: false };

  const row = (usage.data as Record<string, number | string | null>[])[0];
  if (row === undefined) return { ok: false };

  const backupRow = backup.error
    ? null
    : ((backup.data as Record<string, unknown>[] | null)?.[0] ?? null);

  return {
    ok: true,
    storage: {
      bytesUsed: toNumber(row.bytes_used as number | string | null) ?? 0,
      bytesQuota: toNumber(row.bytes_quota as number | string | null) ?? 0,
      objectCount: toNumber(row.object_count as number | string | null) ?? 0,
      usedRatio: toNumber(row.used_ratio as number | string | null) ?? 0,
    },
    // A backup row is genuinely absent until the scheduled job has ever run,
    // which today it has not: the cloud project does not exist. Null says that,
    // where a zero would say "it ran and copied nothing".
    backup:
      backupRow === null
        ? null
        : {
            lastSuccessAt: (backupRow.last_success_at as string | null) ?? null,
            hoursSinceSuccess: toNumber(backupRow.hours_since_success as number | string | null),
            isStale: Boolean(backupRow.is_stale),
            lastError: (backupRow.last_error as string | null) ?? null,
          },
  };
});
