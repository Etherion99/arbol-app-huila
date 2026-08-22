import { ScreenTitle } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/states';
import { texts } from '@/constants/texts';
import { requireCoordinator } from '@/features/auth/session';
import { UserDirectoryTable } from '@/features/users/components/user-directory-table';
import { getDirectory } from '@/features/users/queries';

/**
 * D3 · Gestión de usuarios.
 *
 * The only screen in the whole product where a guardian's email is on screen,
 * which is why the notice under the table says so out loud. The data comes from
 * `user_directory`, the one view that can reach the column, and that view is
 * restricted to coordinators in SQL rather than here.
 */
export default async function Page() {
  // Already resolved by the panel layout, and memoised per request, so this
  // costs nothing beyond reading the cached answer.
  const session = await requireCoordinator();
  const directory = await getDirectory();

  if ('error' in directory) {
    return (
      <>
        <ScreenTitle>{texts.users.title}</ScreenTitle>
        <ErrorState />
      </>
    );
  }

  return (
    <>
      <ScreenTitle suffix={texts.users.countSuffix(directory.guardianTotal)}>
        {texts.users.title}
      </ScreenTitle>

      <UserDirectoryTable
        entries={directory.entries}
        treeCountsAvailable={directory.treeCountsAvailable}
        currentUserId={session.userId}
      />

      <p className="font-sans text-xs text-text-muted">{texts.users.emailNotice}</p>
    </>
  );
}
