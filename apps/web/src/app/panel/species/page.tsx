import { SpeciesMergeScreen } from '@/features/species/components/species-merge-screen';
import { getSingleOccurrenceSpecies, getSpeciesVariants } from '@/features/species/queries';

/**
 * D5 · Fusión de especies.
 *
 * The two reads happen here, on the server, where the coordinator's session
 * already exists and row level security decides what comes back. The screen
 * itself is a Client Component because the whole point of it is a selection.
 */
export default async function Page() {
  const [variants, singleOccurrence] = await Promise.all([
    getSpeciesVariants(),
    getSingleOccurrenceSpecies(),
  ]);

  return (
    <SpeciesMergeScreen
      variants={variants.ok ? variants.value : null}
      singleOccurrence={singleOccurrence.ok ? singleOccurrence.value : null}
    />
  );
}
