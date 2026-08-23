import { Metadata } from 'next';

import { texts } from '@/constants/texts';
import { EmbedMapClient } from './embed-map-client';

export const metadata: Metadata = {
  title: texts.publicMap.embedTitle,
  description: texts.publicMap.embedDescription,
  robots: 'index, follow',
  openGraph: {
    title: texts.publicMap.embedTitle,
    description: texts.publicMap.embedDescription,
    type: 'website',
  },
};

/**
 * E3: Public embeddable map.
 *
 * Designed to be embedded in an <iframe> on another website.
 * No app chrome, breadcrumbs, or authentication required.
 * Uses the same PublicMap component as E1 but with embedMode: true.
 */
export default function EmbedMapPage() {
  return <EmbedMapClient />;
}
