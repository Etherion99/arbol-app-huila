import type { Metadata } from 'next';
import { Archivo, Bricolage_Grotesque, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

/**
 * The three families the design system asks for, self hosted by `next/font` so
 * no page reaches out to Google at render time.
 *
 * Each one publishes its own variable rather than overwriting `--font-display`
 * and friends from design-tokens.css. Those tokens carry the family *names* the
 * design system declares; these carry the faces actually loaded, and globals.css
 * composes the two so the generated stack stays the fallback.
 */
const fontDisplay = Bricolage_Grotesque({
  variable: '--font-display-face',
  subsets: ['latin'],
  display: 'swap',
});

const fontBody = Archivo({
  variable: '--font-body-face',
  subsets: ['latin'],
  display: 'swap',
});

const fontMono = IBM_Plex_Mono({
  variable: '--font-mono-face',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ÁrbolApp Huila',
  description:
    'Geolocalización y seguimiento de árboles frutales del proyecto PRAE "De la pantalla a la realidad", en La Plata, Huila.',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
