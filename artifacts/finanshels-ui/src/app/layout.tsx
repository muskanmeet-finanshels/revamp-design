import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { JetBrains_Mono, Poppins } from 'next/font/google';
import { Toaster } from '@/components/ui/sonner';
import { TimerProvider } from '@/contexts/TimerContext';
import { TimerWidget } from '@/components/TimerWidget';

import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Finanshels',
  description:
    'Finanshels frontend implementation system — screens built from a shared design system.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable}`}>
      <body>
        <TimerProvider>
          {children}
          <TimerWidget />
          <Toaster position="bottom-right" richColors />
        </TimerProvider>
      </body>
    </html>
  );
}
