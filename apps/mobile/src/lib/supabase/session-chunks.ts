/**
 * Splitting and rejoining the stored session.
 *
 * Kept apart from the storage itself, with no dependency on the platform, so
 * the rule that actually protects the session -- no piece ever larger than the
 * keystore accepts -- can be exercised outside a device.
 */

/**
 * Well under the roughly 2 KB the platform keystores accept. The value is
 * percent encoded first, so every character is one byte and this is a byte
 * count rather than a character count.
 */
export const CHUNK_SIZE = 1_500;

export function splitSession(value: string): string[] {
  const encoded = encodeURIComponent(value);
  const chunks: string[] = [];

  for (let start = 0; start < encoded.length; start += CHUNK_SIZE) {
    chunks.push(encoded.slice(start, start + CHUNK_SIZE));
  }

  // An empty string is still a value somebody stored, and it has to come back
  // as one rather than as "no session".
  return chunks.length === 0 ? [''] : chunks;
}

export function joinSession(chunks: readonly string[]): string {
  return decodeURIComponent(chunks.join(''));
}
