import { Sidebar } from '@/components/panel/sidebar';
import { requireCoordinator } from '@/features/auth/session';
import { getModerationCount } from '@/features/moderation/queries';

/**
 * The gate the whole panel sits behind.
 *
 * Every screen from D2 to D7 renders inside this layout, so the role check
 * happens once and no screen can be added that forgets it. A guardian who signs
 * in with their app account and types `/panel` is redirected out here, with a
 * sentence on the sign in screen explaining why -- rather than being shown an
 * empty dashboard that row level security silently stripped.
 *
 * The check is the real one, against the stored role, and not the cookie
 * inspection `proxy.ts` does. Proxy only keeps the anonymous out; it never
 * learns who is a coordinator, because that answer is in the database and
 * proxy runs on every prefetch.
 *
 * No return path is passed to the gate. The only caller that reaches it is
 * signed in already, so sending them back where they were would just deny them
 * again -- what they need is to sign in as somebody else, and then the
 * dashboard is the right place to land. The anonymous case never gets this far:
 * proxy catches it and carries the return path itself.
 */
export default async function PanelLayout({ children }: LayoutProps<'/panel'>) {
  const session = await requireCoordinator();
  const moderationCount = await getModerationCount();

  return (
    <div className="flex min-h-full flex-1 bg-surface-page">
      <Sidebar session={session} moderationCount={moderationCount} />
      <main className="flex min-w-0 flex-1 flex-col gap-4 overflow-auto p-6 px-7">{children}</main>
    </div>
  );
}
