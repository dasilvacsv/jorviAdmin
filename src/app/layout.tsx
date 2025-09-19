import './globals.css';
import type { Metadata } from 'next';
// 1. Importa la fuente Poppins en lugar de Inter
import { Poppins } from 'next/font/google';
import { Providers } from './providers';

// 2. Configura Poppins con los pesos que necesites y asígnale una variable CSS
const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'], // Elige los pesos que usarás
  variable: '--font-poppins', // Nombra la variable CSS
});

export const metadata: Metadata = {
  title: 'Llevatelo con Jorvi - Rifas Exclusivas',
  description:
    'Tu suerte. con Jorvi. Participa en rifas exclusivas y sé el próximo afortunado. ¡La suerte te espera!',
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
    // 3. Aplica la variable de Poppins al HTML
    <html lang="es" className={poppins.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
