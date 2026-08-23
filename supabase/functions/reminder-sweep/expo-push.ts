/**
 * The Expo Push API, and the part of its answer that matters.
 *
 * Sending is the easy half. The half that decides whether this project keeps
 * working for a year is reading the reply: Expo answers a send with one ticket
 * per message, and a ticket can say the token is dead. A sweep that ignores
 * that keeps paying for a push to a phone that was factory reset in March and
 * never stops, which is exactly the failure `devices.is_active` exists to
 * prevent.
 */

/** Where the pushes go. Overridable so the local stack never reaches Expo. */
const EXPO_PUSH_API_URL =
  Deno.env.get('EXPO_PUSH_API_URL') ?? 'https://exp.host/--/api/v2/push/send';

/**
 * Expo accepts at most a hundred messages per request. Larger batches are
 * rejected whole, so the sweep would lose everybody's notification because one
 * vereda planted too many trees.
 */
const MAX_MESSAGES_PER_REQUEST = 100;

export type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  channelId: string;
};

/**
 * One ticket, as Expo reports it.
 *
 * `details.error` is the only field worth branching on. The human `message`
 * changes wording without notice and must never be parsed.
 */
type PushTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message: string; details?: { error?: string } };

export type PushOutcome = {
  /** Tokens Expo accepted. Their guardian was reached. */
  delivered: string[];
  /**
   * Tokens Expo says no longer exist. Deactivated rather than retried: the
   * installation is gone and no number of attempts brings it back.
   */
  unregistered: string[];
  /**
   * Tokens that failed for a reason that may not repeat -- a rate limit, a
   * transport error. Left active so the next sweep tries again.
   */
  retryable: string[];
};

/**
 * Errors that mean the token itself is finished.
 *
 * Everything else Expo can answer -- `MessageRateExceeded`,
 * `MessageTooBig`, a 5xx -- is about this attempt rather than about the
 * installation, so it must not cost a guardian their notifications forever.
 */
const DEAD_TOKEN_ERRORS = new Set(['DeviceNotRegistered', 'InvalidCredentials']);

const empty = (): PushOutcome => ({ delivered: [], unregistered: [], retryable: [] });

/**
 * Sends a batch and sorts the tokens by what came back.
 *
 * A failure of the request itself -- Expo unreachable, a 500, a body that is
 * not the shape documented -- lands every token of that batch in `retryable`.
 * Not in `unregistered`: an outage at Expo must never be recorded as a phone
 * that no longer exists, because that is not reversible from here.
 */
export async function sendPushMessages(messages: PushMessage[]): Promise<PushOutcome> {
  const outcome = empty();

  for (let start = 0; start < messages.length; start += MAX_MESSAGES_PER_REQUEST) {
    const batch = messages.slice(start, start + MAX_MESSAGES_PER_REQUEST);
    const batchOutcome = await sendOneBatch(batch);
    outcome.delivered.push(...batchOutcome.delivered);
    outcome.unregistered.push(...batchOutcome.unregistered);
    outcome.retryable.push(...batchOutcome.retryable);
  }

  return outcome;
}

async function sendOneBatch(batch: PushMessage[]): Promise<PushOutcome> {
  const outcome = empty();
  const tokens = batch.map((message) => message.to);

  let payload: { data?: PushTicket[] };
  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      console.error(`expo push responded ${response.status}: ${await response.text()}`);
      outcome.retryable.push(...tokens);
      return outcome;
    }

    payload = await response.json();
  } catch (caught) {
    console.error(`expo push unreachable: ${caught instanceof Error ? caught.message : caught}`);
    outcome.retryable.push(...tokens);
    return outcome;
  }

  const tickets = payload.data;
  if (!Array.isArray(tickets) || tickets.length !== batch.length) {
    // A reply that does not line up ticket for message cannot be attributed to
    // a token, and guessing would deactivate the wrong installation.
    console.error('expo push returned a reply that does not match the batch');
    outcome.retryable.push(...tokens);
    return outcome;
  }

  tickets.forEach((ticket, index) => {
    const token = tokens[index];

    if (ticket.status === 'ok') {
      outcome.delivered.push(token);
      return;
    }

    if (DEAD_TOKEN_ERRORS.has(ticket.details?.error ?? '')) {
      outcome.unregistered.push(token);
      return;
    }

    console.error(`expo push refused a token: ${ticket.message}`);
    outcome.retryable.push(token);
  });

  return outcome;
}
