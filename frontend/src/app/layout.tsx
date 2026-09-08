import type { Metadata } from 'next';
import { Playfair_Display, Cormorant_Garamond, Source_Serif_4, JetBrains_Mono, Luxurious_Script } from 'next/font/google';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import dynamic from 'next/dynamic';
import { PageTransition } from '@/components/PageTransition';
import { ScrollFadeUpObserver } from '@/components/ScrollFadeUpObserver';
import './globals.css';

const FloatingChatSupport = dynamic(
  () => import('@/components/FloatingChatSupport').then((mod) => mod.FloatingChatSupport),
  { ssr: false }
);

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

const luxuriousScript = Luxurious_Script({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-luxurious-script',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://experienceplatform.in'),
  title: {
    default: 'Journi — Smarter Journeys. Better Choices.',
    template: '%s | Journi',
  },
  description: 'Journi — Smarter journeys. Better choices. Deterministic discovery platform for authentic culinary, cultural, artisan, and adventure experiences across India.',
  keywords: ['Journi', 'Maharashtra Travel', 'Local Experiences', 'Authentic Food Tours', 'Artisan Workshops', 'Culture Walk', 'Mumbai', 'Thane', 'Navi Mumbai', 'Panvel', 'Powai'],
  icons: {
    icon: '/images/Journi-bg-rm.png',
    apple: '/images/Journi-bg-rm.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="no-referrer" />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body suppressHydrationWarning className={`${sourceSerif.className} ${playfair.variable} ${cormorant.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} ${luxuriousScript.variable} bg-[#F5F1E6] text-[#2C2C2C] antialiased selection:bg-[#8B7355]/30 selection:text-[#2C2C2C] overflow-x-hidden`}>
        <ScrollFadeUpObserver />
        <PageTransition />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <FloatingChatSupport />
      </body>
    </html>
  );
}
