'use client';

import { useId, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { EmptyState } from '@/components/ui/states';
import {
  Table,
  TableBody,
  TableCell,
  TableFigure,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { texts } from '@/constants/texts';
import type { DirectoryEntry } from '@/features/users/queries';
import { UserStatusDialog } from '@/features/users/components/user-status-dialog';
import { cn } from '@/lib/utils';

/**
 * The Unicode block that `normalize('NFD')` splits an accent into. Matching the
 * range rather than `\p{Diacritic}` keeps the regex readable without the
 * unicode flag.
 */
const COMBINING_MARKS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Folds case and accents so "Andres" finds "Andrés". */
function foldForSearch(value: string): string {
  return value.normalize('NFD').replace(COMBINING_MARKS, '').toLocaleLowerCase('es-CO');
}

function matches(entry: DirectoryEntry, needle: string): boolean {
  return (
    foldForSearch(entry.fullName).includes(needle) || foldForSearch(entry.email).includes(needle)
  );
}

/** The badge on the right of a row: deactivated, overdue trees, or in order. */
function StatusCell({ entry }: { entry: DirectoryEntry }) {
  if (entry.archivedAt) return <Badge tone="archived">{texts.users.statusArchived}</Badge>;

  if (entry.overdueTotal !== null && entry.overdueTotal > 0) {
    return <Badge tone="overdue">{texts.users.overdueCount(entry.overdueTotal)}</Badge>;
  }

  return <Badge tone="up_to_date">{texts.users.statusActive}</Badge>;
}

export type UserDirectoryTableProps = {
  entries: readonly DirectoryEntry[];
  /** False when the profiles loaded but the per guardian tree tally did not. */
  treeCountsAvailable: boolean;
  /**
   * The coordinator reading the screen. Their own row carries no action:
   * deactivating yourself is allowed by the policies and locks you out of the
   * panel, since the role gate reads `archived_at`.
   */
  currentUserId: string;
};

/**
 * The D3 table.
 *
 * A real `<table>` from the catalogue and not the canvas's grid of spans: with
 * `<th scope="col">` behind each cell, "12" keeps meaning "12 árboles" when the
 * row is read out one cell at a time.
 *
 * The search filters during render. Copying the list into state and syncing it
 * from an effect would render twice and leave a frame showing the previous
 * results.
 */
export function UserDirectoryTable({
  entries,
  treeCountsAvailable,
  currentUserId,
}: UserDirectoryTableProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();

  const needle = foldForSearch(query.trim());
  const visible = needle ? entries.filter((entry) => matches(entry, needle)) : entries;

  return (
    <>
      <div className="flex justify-end">
        <SearchInput
          id={searchId}
          label={texts.users.searchLabel}
          placeholder={texts.users.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full max-w-65"
        />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="w-[30%]">{texts.users.columns.guardian}</TableHeader>
              <TableHeader className="w-[22%]">{texts.users.columns.role}</TableHeader>
              <TableHeader className="w-[11%]">{texts.users.columns.trees}</TableHeader>
              <TableHeader className="w-[11%]">{texts.users.columns.upToDate}</TableHeader>
              <TableHeader className="w-[14%]">{texts.users.columns.status}</TableHeader>
              <TableHeader className="w-[12%] text-right">
                {texts.users.columns.actions}
              </TableHeader>
            </TableRow>
          </TableHead>

          <TableBody>
            {visible.map((entry) => (
              <TableRow key={entry.id} className={cn(entry.archivedAt && 'opacity-60')}>
                {/* The row header, so every figure beside it is announced with
                    the name of the person it belongs to. */}
                <TableHeader
                  scope="row"
                  className="px-4.5 py-3.5 font-sans text-sm normal-case tracking-normal"
                >
                  <span className="font-semibold text-text-primary">{entry.fullName}</span>
                  <br />
                  <span className="font-mono text-[11px] font-normal text-text-muted">
                    {entry.email}
                  </span>
                </TableHeader>

                <TableCell className="text-text-secondary">
                  {texts.users.roles[entry.role]}
                  {entry.institution ? (
                    <>
                      <br />
                      <span className="text-xs text-text-muted">{entry.institution}</span>
                    </>
                  ) : null}
                </TableCell>

                <TableCell>
                  {entry.treeTotal === null ? (
                    <span className="text-text-muted">{texts.common.noValue}</span>
                  ) : (
                    <TableFigure>{entry.treeTotal}</TableFigure>
                  )}
                </TableCell>

                <TableCell>
                  {entry.upToDateTotal === null ? (
                    <span className="text-text-muted">{texts.common.noValue}</span>
                  ) : (
                    <TableFigure className="text-accent">{entry.upToDateTotal}</TableFigure>
                  )}
                </TableCell>

                <TableCell>
                  <StatusCell entry={entry} />
                </TableCell>

                <TableCell className="text-right">
                  {entry.id === currentUserId ? (
                    <span className="font-sans text-xs text-text-muted">
                      {texts.users.yourAccount}
                    </span>
                  ) : (
                    <UserStatusDialog
                      userId={entry.id}
                      fullName={entry.fullName}
                      archived={entry.archivedAt !== null}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {visible.length === 0 ? (
          <EmptyState
            title={needle ? texts.users.noResultsTitle : texts.users.emptyTitle}
            body={needle ? texts.users.noResultsBody : undefined}
          />
        ) : null}

        {!treeCountsAvailable && visible.length > 0 ? (
          <p className="border-t border-border-subtle px-4.5 py-3 font-sans text-xs text-text-secondary">
            {texts.users.treeCountsUnavailable}
          </p>
        ) : null}
      </Card>
    </>
  );
}
