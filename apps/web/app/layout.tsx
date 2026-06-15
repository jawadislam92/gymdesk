import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import { SwRegister } from './sw-register';

export const metadata: Metadata = {
  title: 'GymFlow Suite',
  description: 'Your gym — membership, classes, workouts, payments & QR check-in.',
  appleWebApp: { capable: true, title: 'GymFlow', statusBarStyle: 'default' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <SwRegister />
      </body>
    </html>
  );
}
