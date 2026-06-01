import './globals.css';
import type { Metadata } from 'next';
import { Playfair_Display, Plus_Jakarta_Sans } from 'next/font/google';
import Providers from './providers';
import Shell from './components/Shell';
import TopLoader from './components/TopLoader';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Foodeez — Restaurant Console',
  description: 'Restaurant partner management platform',
  icons: {
    icon: '/foodeez-sidebar-logo.png',
    shortcut: '/foodeez-sidebar-logo.png',
    apple: '/foodeez-sidebar-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="min-h-screen font-sans antialiased bg-[var(--bg)] text-[var(--tx)]">
        <TopLoader />
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}