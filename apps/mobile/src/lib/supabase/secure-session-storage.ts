import * as SecureStore from 'expo-secure-store';

import { joinSession, splitSession } from '@/lib/supabase/session-chunks';

/**
 * Session storage for Supabase Auth backed by the platform keystore.
 *
 * The session is a bearer credential: whoever holds it is the guardian until
 * it expires. AsyncStorage keeps it in plain text inside the app sandbox,
 * where any backup or rooted device reads it, so it is not an option here.
 *
 * SecureStore does encrypt, but rejects values much over 2 KB and a Supabase
 * session -- two JWTs plus the user object -- goes past that, so the value is
 * split across numbered entries. Every piece still lives in the keystore;
 * nothing is written anywhere else.
 */

const OPTIONS: SecureStore.SecureStoreOptions = {
  // A session restored onto a different phone from a backup is a credential
  // in a place its owner did not put it. Signing in again is the right cost.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const countKey = (key: string) => `${key}.count`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key), OPTIONS);
  if (raw === null) {
    return 0;
  }
  const count = Number.parseInt(raw, 10);
  return Number.isInteger(count) && count > 0 ? count : 0;
}

async function removeChunksFrom(key: string, firstIndex: number, previousCount: number) {
  const removals: Promise<void>[] = [];
  for (let index = firstIndex; index < previousCount; index += 1) {
    removals.push(SecureStore.deleteItemAsync(chunkKey(key, index), OPTIONS));
  }
  await Promise.all(removals);
}

export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) {
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        SecureStore.getItemAsync(chunkKey(key, index), OPTIONS),
      ),
    );

    // A missing piece means the stored session is incomplete and cannot be
    // trusted. Reporting no session sends the guardian to sign in, which is
    // recoverable; handing back half a session is not.
    if (chunks.some((chunk) => chunk === null)) {
      await this.removeItem(key);
      return null;
    }

    return joinSession(chunks as string[]);
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousCount = await readCount(key);
    const chunks = splitSession(value);

    // The count is written last and cleared first, so it is the commit marker.
    // A write cut short by the process dying leaves no count, which reads back
    // as no session rather than as a mix of the old one and the new one.
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
    await Promise.all(
      chunks.map((chunk, index) => SecureStore.setItemAsync(chunkKey(key, index), chunk, OPTIONS)),
    );
    await SecureStore.setItemAsync(countKey(key), String(chunks.length), OPTIONS);
    await removeChunksFrom(key, chunks.length, previousCount);
  },

  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await SecureStore.deleteItemAsync(countKey(key), OPTIONS);
    await removeChunksFrom(key, 0, count);
  },
};
