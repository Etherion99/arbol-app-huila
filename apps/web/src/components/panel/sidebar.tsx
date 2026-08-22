'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { texts } from '@/constants/texts';
import type { PanelSession } from '@/features/auth/session';
import { signOut } from '@/features/auth/actions';
import { isActive, navItems } from '@/components/panel/nav-items';
import { cn } from '@/lib/utils';

/**
 * The panel's navigation, shared by every screen from D2 to D7.
 *
 * A Client Component only because the active item depends on the current path.
 * The session comes down as a prop from the server layout, so the sidebar never
 * queries anything itself and the coordinator's name is rendered on the server
 * where it was already fetched.
 */
export function Sidebar({
  session,
  /**
   * How many trees are flagged for review, shown beside "Moderación". Undefined
   * while the count is unknown, which is not the same as zero: an unknown count
   * shows nothing rather than a reassuring 0.
   */
  moderationCount,
}: {
  session: PanelSession;
  moderationCount?: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={texts.common.panelName}
      className="flex w-[220px] shrink-0 flex-col gap-0.5 border-r border-border-subtle p-5 px-3"
    >
      <div className="px-2.5 pb-4">
        <p className="font-heading text-base font-extrabold text-accent">
          ÁrbolApp <span className="text-accent-2">Huila</span>
        </p>
        <p className="mt-0.5 font-mono text-[9px] tracking-wider text-text-muted">
          {texts.nav.kicker}
        </p>
      </div>

      <ul className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = isActive(item, pathname);
          const Icon = item.icon;
          const showCount = item.href === navItems[2].href && moderationCount !== undefined;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-hit items-center gap-2.5 rounded-lg px-2.5 font-sans text-sm transition-colors',
                  'focus-visible:ring-3 focus-visible:ring-border-focus/50 focus-visible:outline-none',
                  active
                    ? 'bg-accent-soft font-semibold text-accent'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
                )}
              >
                <Icon />
                <span className="flex-1">{item.label}</span>
                {showCount ? (
                  <span
                    // The count is decoration next to a label the badge repeats
                    // in full for anyone not reading the number.
                    className="rounded-full bg-state-due-soft px-2 py-px font-mono text-[11px] text-earth-brown"
                  >
                    <span aria-hidden="true">{moderationCount}</span>
                    <span className="sr-only">
                      {texts.nav.moderationBadge(moderationCount ?? 0)}
                    </span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex-1" />

      <div className="flex items-center gap-2.5 border-t border-border-subtle p-2.5">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-overlay font-sans text-xs font-bold text-accent"
        >
          {session.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[13px] font-semibold text-text-primary">
            {session.fullName}
          </p>
          <p className="truncate font-sans text-[11px] text-text-muted">
            {texts.nav.coordinatorRole}
          </p>
        </div>
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className={cn(
            'min-h-hit w-full rounded-lg px-2.5 text-left font-sans text-[13px] text-text-link',
            'transition-colors hover:bg-accent-soft hover:text-text-link-hover',
            'focus-visible:ring-3 focus-visible:ring-border-focus/50 focus-visible:outline-none',
          )}
        >
          {texts.nav.signOut}
        </button>
      </form>
    </nav>
  );
}
