import { texts } from '@/constants/texts';

/**
 * Turning a failure into a sentence that says what to do next.
 *
 * A generic "ocurrió un error" after a guardian has walked to a tree, filled in
 * four steps and taken a photograph is a dead end, and dead ends are what make
 * people stop using an app. Every failure this layer can name gets named.
 */

/** SQLSTATE of a unique violation, which is how a duplicate cycle arrives. */
export const DUPLICATE_KEY = '23505';

/**
 * A failure raised by the client itself, wearing the same SQLSTATE the database
 * would have used. It lets one `describeTreeError` handle both without the
 * screens caring which side noticed.
 */
export class TreeOperationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'TreeOperationError';
  }
}

/** What Supabase hands back on a failure, as much of it as is worth reading. */
export type PostgrestFailure = {
  code?: string;
  message?: string;
};

export function isDuplicateCycle(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === DUPLICATE_KEY
  );
}

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
