import { Metadata } from 'next';
import { EmbedMapClient } from './embed-map-client';

export const metadata: Metadata = {
  title: 'Mapa de árboles - ÁrbolApp Huila',
  description: 'Mapa interactivo de árboles del proyecto PRAE',
  robots: 'index, follow',
  openGraph: {
    title: 'Mapa de árboles - ÁrbolApp Huila',
    description: 'Mapa interactivo de árboles del proyecto PRAE',
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
