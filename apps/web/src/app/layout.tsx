import type { Metadata } from 'next';
import { Montserrat, Open_Sans, Roboto, Roboto_Mono } from 'next/font/google';
import './globals.css';

/**
 * The four families the design system asks for, self hosted by `next/font` so
 * no page reaches out to Google at render time.
 *
 * Each one publishes its own variable rather than overwriting `--font-display`
 * and friends from design-tokens.css. Those tokens carry the family *names* the
 * design system declares; these carry the faces actually loaded, and globals.css
 * composes the two so the generated stack stays the fallback.
 *
 * All four ship as variable fonts, so no `weight` is declared: one file covers
 * the whole axis the branding guide asks for instead of one file per step.
 */
const fontDisplay = Montserrat({
  variable: '--font-display-face',
  subsets: ['latin'],
  display: 'swap',
});

/** Subtitles and section headings. A role of its own since the 2026 guide. */
const fontSubhead = Open_Sans({
  variable: '--font-subhead-face',
  subsets: ['latin'],
  display: 'swap',
});

// Italic is loaded because this is the running text: without a real italic the
// browser slants the roman itself, which is the synthetic smear the mobile
// theme avoids by naming one face per weight.
const fontBody = Roboto({
  variable: '--font-body-face',
  subsets: ['latin'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const fontMono = Roboto_Mono({
  variable: '--font-mono-face',
  subsets: ['latin'],
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
      className={`${fontDisplay.variable} ${fontSubhead.variable} ${fontBody.variable} ${fontMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
