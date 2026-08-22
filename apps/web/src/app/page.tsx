import { redirect } from 'next/navigation';

import { routes } from '@/lib/routes';

/**
 * There is no landing page yet. The public map is a later phase, so the root
 * sends the visitor to the panel; the gate there decides whether they get in.
 */
export default function Home() {
  redirect(routes.dashboard);
}
