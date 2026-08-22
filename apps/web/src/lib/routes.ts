/**
 * Every path the panel can be at, named once.
 *
 * The sidebar, the role gate in `proxy.ts` and the redirects after signing in
 * all have to agree on these strings. Three copies of `/panel/users` is how one
 * of them ends up as `/panel/usuarios` and the active-item highlight quietly
 * stops matching.
 *
 * The segments are English because they are code; what the coordinator reads is
 * in `constants/texts.ts`.
 */
export const routes = {
  signIn: '/sign-in',
  dashboard: '/panel',
  users: '/panel/users',
  moderation: '/panel/moderation',
  tree: (treeId: string) => `/panel/moderation/${treeId}`,
  species: '/panel/species',
  export: '/panel/export',
} as const;

/** Prefix every screen behind the coordinator gate shares. */
export const PANEL_PREFIX = '/panel';

/**
 * Query parameter carrying where the visitor was heading when the gate sent
 * them to sign in, so they land there instead of on the dashboard.
 */
export const REDIRECT_PARAM = 'next';

/**
 * Query parameter set when the gate turned away a signed-in guardian, so the
 * sign in screen can say why it is showing again instead of looking broken.
 */
export const DENIED_PARAM = 'denied';

/**
 * Keeps an open redirect out of the `next` parameter: only a path inside this
 * panel is ever followed, never an absolute URL to somewhere else.
 */
export function safeRedirect(target: string | null | undefined): string {
  if (!target) return routes.dashboard;
  if (!target.startsWith('/') || target.startsWith('//')) return routes.dashboard;
  return target;
}
