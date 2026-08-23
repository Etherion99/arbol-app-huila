import { texts } from '@/constants/texts';
import { DUPLICATE_KEY } from '@/features/sync/sync-queue-model';

/**
 * Turning a failure into a sentence that says what to do next.
 *
 * A generic "ocurrió un error" after a guardian has walked to a tree, filled in
 * four steps and taken a photograph is a dead end, and dead ends are what make
 * people stop using an app. Every failure this layer can name gets named.
 *
 * Its reader is now the pending card of the sync queue rather than a screen
 * catching its own rejection: no screen writes to the server any more, so a
 * refusal reaches a guardian hours later, attached to a job. That is why a
 * queued job stores the SQLSTATE and not just a message — it is the key into
 * this function, and losing it would cost every one of these sentences.
 */

/** What Supabase hands back on a failure, as much of it as is worth reading. */
export type PostgrestFailure = {
  code?: string;
  message?: string;
};

/**
 * The message for a failure, chosen from its SQLSTATE where there is one.
 *
 * The codes are the ones the migration raises deliberately: `42501` for a call
 * without a session, `22023` for a zone or a species that will not resolve,
 * `54000` for a municipality whose four digit code range is full.
 */
export function describeTreeError(error: unknown, isOnline: boolean): string {
  if (!isOnline) {
    return texts.treeErrors.offline;
  }

  if (typeof error !== 'object' || error === null) {
    return texts.treeErrors.unknown;
  }

  const failure = error as PostgrestFailure;
  const message = failure.message ?? '';

  switch (failure.code) {
    case '42501':
      // Either the session is gone or a row level policy refused the write. The
      // two are told apart by what the function itself raises.
      return message.includes('signed in')
        ? texts.treeErrors.notSignedIn
        : texts.treeErrors.notOwner;
    case '54000':
      return texts.treeErrors.codeExhausted;
    case DUPLICATE_KEY:
      return texts.treeErrors.duplicateCycle;
    case '22023':
      return message.includes('species')
        ? texts.treeErrors.speciesBlank
        : texts.treeErrors.zoneUnknown;
    default:
      break;
  }

  // Not a database answer at all: the request never arrived. Worth telling
  // apart, because the fix is the connection rather than the form.
  if (message.toLowerCase().includes('network') || message.toLowerCase().includes('fetch')) {
    return texts.treeErrors.network;
  }

  return texts.treeErrors.unknown;
}
