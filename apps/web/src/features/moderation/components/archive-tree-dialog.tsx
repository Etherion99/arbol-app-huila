'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent, DialogRoot, DialogTrigger } from '@/components/ui/dialog';
import { TextAreaField } from '@/components/ui/field';
import { texts } from '@/constants/texts';
import { archiveTree } from '@/features/moderation/actions';

/** Mirrors the server's own floor, so the button unlocks when the action would accept. */
const MIN_REASON_LENGTH = 10;

export type ArchiveTreeDialogProps = {
  treeId: string;
  /** What the tree is called in the title, e.g. "Mango · HUI-LP-0042". */
  treeName: string;
};

/**
 * The heart of D4: archiving a tree, with a motive that is not optional.
 *
 * Three things this dialog must never stop doing. The explanation goes through
 * the dialog's `description`, so a screen reader announces "nada se borra"
 * *before* the coordinator reaches the confirm button rather than after. The
 * confirm button stays disabled until a reason is written, because the guardian
 * reads that reason and has a right to know why their tree left the map. And a
 * failure is always shown -- the dialog stays open with the sentence attached
 * to the field, so nobody walks away believing a tree was archived when it was
 * not.
 *
 * The action is called from a transition rather than through `useActionState`,
 * so the outcome is available where the dialog is closed. Closing from an
 * effect that watched a success flag would be derived state driven by
 * `setState`, which is exactly the cascade this project forbids.
 */
export function ArchiveTreeDialog({ treeId, treeName }: ArchiveTreeDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reasonMissing = reason.trim().length < MIN_REASON_LENGTH;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await archiveTree(formData);

      if (result.done) {
        setOpen(false);
        setReason('');
        setError(null);
        return;
      }

      setError(result.error);
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // A reopened dialog starts clean rather than showing the refusal from a
    // previous attempt on a tree the coordinator has moved on from.
    if (!next) setError(null);
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm">
            {texts.moderation.archiveAction}
          </Button>
        }
      />

      <DialogContent
        title={texts.moderation.archiveTitle(treeName)}
        description={
          <>
            {texts.moderation.archiveBody}{' '}
            <b className="font-semibold text-text-primary">
              {texts.moderation.archiveBodyEmphasis}
            </b>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <input type="hidden" name="treeId" value={treeId} />

          <TextAreaField
            label={texts.moderation.reasonLabel}
            name="reason"
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={texts.moderation.reasonPlaceholder}
            error={error ?? undefined}
          />

          <div className="mt-1 flex justify-end gap-2.5">
            <DialogClose render={<Button variant="secondary">{texts.common.cancel}</Button>} />
            {/* The grey `archive` variant and never `danger`: a red button
                would tell the coordinator something is being destroyed. */}
            <Button type="submit" variant="archive" disabled={reasonMissing || pending}>
              {pending ? texts.moderation.archiving : texts.moderation.confirm}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
