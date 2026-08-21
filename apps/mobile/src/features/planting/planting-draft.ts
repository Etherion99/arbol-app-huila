import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { z } from 'zod/v4';

import { todayInColombia } from '@/lib/dates';

/**
 * The planting form, kept on the phone until it has been sent.
 *
 * A guardian filling this in is standing in a vereda, often with the app in the
 * background because a call came in or the screen locked. Losing a half filled
 * form there does not mean retyping it -- it means walking away, and the tree
 * never gets registered. So every change is written to disk, and it survives the
 * app being killed.
 *
 * This is deliberately not the offline queue of Phase 8. Nothing here retries in
 * the background or sends anything on its own: it is one draft, saved, that the
 * guardian comes back to and submits by hand. The full queue, with several
 * pending writes and automatic drain, is that phase's job and is not started
 * here.
 */

const DRAFT_FILE = 'planting-draft.json';

/** The photograph as the draft remembers it, once one has been taken. */
const preparedPhotoSchema = z.object({
  photoUri: z.string(),
  thumbnailUri: z.string(),
  photoBytes: z.number(),
  capturedAt: z.string(),
  captureLocation: z.object({ lat: z.number(), lng: z.number() }).nullable(),
});

/**
 * Parsed rather than cast. The file on disk was written by an older build of
 * the app as often as not, and a renamed field has to surface as "no draft"
 * instead of as `undefined` painted onto a form.
 */
const draftSchema = z.object({
  savedAt: z.string(),
  step: z.number().int().min(0).max(3),
  location: z.object({ lat: z.number(), lng: z.number() }).nullable(),
  accuracyMetres: z.number().nullable(),
  municipalityId: z.string().nullable(),
  villageId: z.string().nullable(),
  speciesRawText: z.string(),
  plantedAt: z.string(),
  heightCm: z.string(),
  visibleBranches: z.number().int().min(0),
  photo: preparedPhotoSchema.nullable(),
  /**
   * Set once the row is in the database but its photograph is not yet in the
   * bucket. It is what turns a failed upload into a retry instead of a second
   * tree: the registration already happened, and only the object is missing.
   */
  registration: z.object({ treeId: z.string(), code: z.string(), cycle: z.number() }).nullable(),
});

export type PlantingDraft = z.output<typeof draftSchema>;

export function emptyDraft(): PlantingDraft {
  return {
    savedAt: new Date().toISOString(),
    step: 0,
    location: null,
    accuracyMetres: null,
    municipalityId: null,
    villageId: null,
    speciesRawText: '',
    plantedAt: todayInColombia(),
    heightCm: '',
    visibleBranches: 1,
    photo: null,
    registration: null,
  };
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/** False until the file has been read, so nothing offers to resume too early. */
export type PlantingDraftState = {
  isLoaded: boolean;
  draft: PlantingDraft | null;
};

let state: PlantingDraftState = { isLoaded: false, draft: null };
const listeners = new Set<() => void>();

function draftFile(): File {
  const directory = new Directory(Paths.document);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }
  return new File(directory, DRAFT_FILE);
}

function emit(next: PlantingDraftState) {
  state = next;
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Reads the draft off disk once, at start up.
 *
 * Synchronous on purpose: the file is a few hundred bytes, and the alternative
 * is a screen that renders "no draft" and flickers into "you have one" a frame
 * later, which is exactly the moment a guardian taps "empezar de nuevo".
 */
export function loadPlantingDraft(): void {
  if (state.isLoaded) {
    return;
  }

  try {
    const file = draftFile();

    if (!file.exists) {
      emit({ isLoaded: true, draft: null });
      return;
    }

    const parsed = draftSchema.safeParse(JSON.parse(file.textSync()));

    // A draft written by an older build cannot be read, so it is cleared rather
    // than left to fail the same way on every launch.
    if (!parsed.success) {
      file.delete();
      emit({ isLoaded: true, draft: null });
      return;
    }

    emit({ isLoaded: true, draft: parsed.data });
  } catch {
    emit({ isLoaded: true, draft: null });
  }
}

function persist(next: PlantingDraft | null) {
  emit({ isLoaded: true, draft: next });

  try {
    const file = draftFile();

    if (next === null) {
      if (file.exists) {
        file.delete();
      }
      return;
    }

    if (!file.exists) {
      file.create({ overwrite: true });
    }
    file.write(JSON.stringify(next));
  } catch {
    // The write failed: the disk is full, or the directory is gone. The draft is
    // still correct in memory, so the form in front of the guardian keeps
    // working and only surviving a restart is lost -- which is not something
    // worth interrupting a half filled form to say.
  }
}

/** Replaces the draft, stamping when it was saved. */
export function savePlantingDraft(draft: PlantingDraft): void {
  persist({ ...draft, savedAt: new Date().toISOString() });
}

/** Throws the draft away, once it has been sent or the guardian starts over. */
export function clearPlantingDraft(): void {
  persist(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * The stored draft, read during render.
 *
 * A module level store behind `useSyncExternalStore` rather than a context with
 * an effect: the draft is external state that outlives every component looking
 * at it, and mirroring it into React state would repaint the wizard on a
 * schedule of its own.
 */
export function useStoredPlantingDraft(): PlantingDraftState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
