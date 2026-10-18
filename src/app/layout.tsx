import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';

/* Fuentes servidas desde el propio dominio con next/font: la CSP no deja salir a Google. */
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--ff-fraunces',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--ff-inter', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--ff-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'MOREFEST',
  description: 'Reservas de mesas y control de acceso de MOREFEST, Renacer de Morella Montiel, en VOLTERRA.',
  applicationName: 'MOREFEST',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#140c08',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
