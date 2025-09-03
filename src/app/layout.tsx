// En app/layout.tsx

import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';

// 1. Añade la propiedad "variable"
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // Nombra la variable CSS
});

export const metadata: Metadata = {
  title: 'Llevatelo con Jorvi - Rifas Exclusivas',
  description: 'Tu suerte. con Jorvi. Participa en rifas exclusivas y sé el próximo afortunado. ¡La suerte te espera!',
  icons: {
    icon: '/jorvi.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // 2. Aplica la variable al HTML o al BODY
    <html lang="es" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}