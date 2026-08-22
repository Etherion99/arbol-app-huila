import type { ComponentType, SVGProps } from 'react';

import { texts } from '@/constants/texts';
import { routes } from '@/lib/routes';

type IconProps = SVGProps<SVGSVGElement>;

/**
 * The five sidebar icons, traced from the canvas rather than pulled from
 * `lucide-react`.
 *
 * They are hand-written because the canvas draws its own: the tree glyph in
 * particular is the project's mark and no icon set has it. Keeping all five
 * together means they share a stroke weight and a box, which is what makes a
 * row of icons look like a set instead of five borrowed pictures.
 */
function iconProps(props: IconProps): IconProps {
  return {
    viewBox: '0 0 24 24',
    width: 17,
    height: 17,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    'aria-hidden': true,
    ...props,
  };
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect x="3" y="12" width="5" height="9" />
      <rect x="10" y="6" width="5" height="15" />
      <rect x="17" y="9" width="5" height="12" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" />
    </svg>
  );
}

export function ModerationIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
    </svg>
  );
}

export function SpeciesIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7 20h10M12 20v-8m0 0c-4 0-6-2.5-6-6 3.5 0 6 2 6 6zm0-2c0-4 2.5-6 6-6 0 3.5-2 6-6 6z" />
    </svg>
  );
}

export function ExportIcon(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
    </svg>
  );
}

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
  /**
   * Whether a deeper path still lights this item up. The tree detail lives
   * under `/panel/moderation/:id` and belongs to Moderación, but the dashboard
   * at `/panel` must not match every path that starts with it.
   */
  matchNested: boolean;
};

/** The sidebar, in the order the canvas lists it. */
export const navItems: readonly NavItem[] = [
  {
    href: routes.dashboard,
    label: texts.nav.dashboard,
    icon: DashboardIcon,
    matchNested: false,
  },
  { href: routes.users, label: texts.nav.users, icon: UsersIcon, matchNested: true },
  {
    href: routes.moderation,
    label: texts.nav.moderation,
    icon: ModerationIcon,
    matchNested: true,
  },
  { href: routes.species, label: texts.nav.species, icon: SpeciesIcon, matchNested: true },
  { href: routes.export, label: texts.nav.export, icon: ExportIcon, matchNested: true },
];

/** True when `pathname` should highlight `item`. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  return item.matchNested && pathname.startsWith(`${item.href}/`);
}
