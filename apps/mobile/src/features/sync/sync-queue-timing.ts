/**
 * How long a screen waits on the job it just saved before it stops watching.
 *
 * Not a network timeout: nothing is cancelled when it runs out. The job carries
 * on in the queue and the screen simply changes what it says, from "here is
 * your tree" to "this is on your phone and will go up on its own".
 *
 * Forty seconds is chosen against the slow case rather than the fast one. With
 * usable signal a planting is a call and two uploads of a couple of hundred
 * kilobytes and is through in seconds; on the edge of coverage the same work
 * takes most of this window, and giving up at ten would tell a guardian their
 * tree is still waiting while it was in fact arriving. It is only ever paid on
 * a connection that exists and is struggling -- with no connection at all the
 * wait ends immediately, because the queue reports that it cannot send rather
 * than letting the clock run.
 */
export const SETTLE_TIMEOUT_MS = 40_000;
