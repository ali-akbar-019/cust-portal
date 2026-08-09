import type { Metadata } from 'next';
import { Source_Serif_4, Inter, IBM_Plex_Mono } from 'next/font/google';
import { AuthProvider } from '@/lib/auth-context';
import './globals.css';

// Serif display face carries the "academic ledger" personality — used for
// all headings. Inter is the body/UI workhorse. Plex Mono renders course
// codes, enrollment numbers, ISBNs — anything that reads as a record ID.
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-data',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'CUST Portal',
  description: 'Capital University of Science & Technology — Student & Faculty Portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sourceSerif.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
