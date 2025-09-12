// app/admin/layout.tsx
// SIN "use client";

import { auth } from '@/lib/auth'; // Asegúrate de que la ruta sea correcta
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar'; // Importamos el nuevo componente

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Protección de ruta en el servidor (middleware) y como fallback
  if (!session || session.user?.role !== 'admin') {
    redirect('/auth/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar session={session} />
      
      {/* Contenedor del contenido principal para que se desplace independientemente */}
      <div className="flex-1">
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}