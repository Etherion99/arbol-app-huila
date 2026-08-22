'use client';

import { useState, useTransition, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { DialogClose, DialogContent, DialogRoot, DialogTrigger } from '@/components/ui/dialog';
import { TextAreaField } from '@/components/ui/field';
import { texts } from '@/constants/texts';
import { deactivateUser, reactivateUser } from '@/features/users/actions';

/** Mirrors the server's own floor, so the button unlocks when the action would accept. */
const MIN_REASON_LENGTH = 10;

export type UserStatusDialogProps = {
  userId: string;
  fullName: string;
  /** True when the account is already deactivated, so the dialog reactivates it. */
  archived: boolean;
};

/**
 * Deactivating and reactivating an account, from the row it belongs to.
 *
 * Deactivation asks for a reason and will not proceed without one, for the same
 * reason archiving a tree will not: this is a soft delete on a PRAE record, and
 * a record that disappeared for reasons nobody wrote down is a record nobody
 * can defend later. The confirm button is the grey `archive` variant and never
 * the red one -- red would tell the coordinator something is being destroyed,
 * and nothing is.
 */
export function UserStatusDialog({ userId, fullName, archived }: UserStatusDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const action = archived ? texts.users.activate : texts.users.deactivate;
  const reasonMissing = !archived && reason.trim().length < MIN_REASON_LENGTH;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await (archived ? reactivateUser(formData) : deactivateUser(formData));

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
    if (!next) setError(null);
  }

  return (
    <DialogRoot open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={texts.users.rowActionLabel(action, fullName)}
          >
            {action}
          </Button>
        }
      />

      <DialogContent
        title={
          archived ? texts.users.activateTitle(fullName) : texts.users.deactivateTitle(fullName)
        }
        description={
          archived ? (
            texts.users.activateBody
          ) : (
            <>
              {texts.users.deactivateBody}{' '}
              <b className="font-semibold text-text-primary">
                {texts.users.deactivateBodyEmphasis}
              </b>
            </>
          )
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <input type="hidden" name="userId" value={userId} />

          {archived ? null : (
            <TextAreaField
              label={texts.users.deactivateReasonLabel}
              name="reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={texts.users.deactivateReasonPlaceholder}
              error={error ?? undefined}
            />
          )}

          {archived && error ? (
            <p role="alert" className="font-sans text-[13px] text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex justify-end gap-2.5">
            <DialogClose render={<Button variant="secondary">{texts.common.cancel}</Button>} />
            <Button type="submit" variant="archive" disabled={reasonMissing || pending}>
              {pending
                ? archived
                  ? texts.users.activating
                  : texts.users.deactivating
                : archived
                  ? texts.users.activateConfirm
                  : texts.users.deactivateConfirm}
            </Button>
          </div>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
