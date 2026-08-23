import { Directory, File, Paths } from 'expo-file-system';

import type { QueueStorage } from '@/features/sync/sync-queue-engine';

/**
 * Where the queue lives between launches.
 *
 * The document directory, not the cache. The cache is what the operating system
 * reclaims when storage runs low, and the whole promise of this queue is that a
 * guardian who registered a tree in a vereda on Saturday still has it on Monday.
 * It is the same directory the prepared photographs are in, which is what keeps
 * the two from being reclaimed independently of each other.
 *
 * Synchronous, like the planting draft, and for the same reason: the file is a
 * few kilobytes and the first frame of the app has to know whether there is
 * anything waiting. A count that arrives one frame late is a connection strip
 * that appears, says nothing, and then changes its mind in front of somebody
 * who is trying to read it.
 */

const QUEUE_FILE = 'sync-queue.json';

function queueFile(): File {
  const directory = new Directory(Paths.document);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  return new File(directory, QUEUE_FILE);
}

export const fileQueueStorage: QueueStorage = {
  read() {
    const file = queueFile();
    return file.exists ? file.textSync() : null;
  },

  write(text) {
    const file = queueFile();
    if (!file.exists) {
      file.create({ overwrite: true });
    }
    file.write(text);
  },
};
