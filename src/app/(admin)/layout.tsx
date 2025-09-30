// app/admin/layout.tsx

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Toaster } from "@/components/ui/toaster";
import { NotificationProvider } from '@/contexts/NotificationContext'; // 1. Importa el Provider del contexto
import { Header } from '@/components/Header'; // 2. Importa el nuevo Header

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session || session.user?.role !== 'admin') {
    redirect('/auth/login');
  }

  return (
    // 3. Envuelve TODO con el NotificationProvider
    <NotificationProvider>
        <div className="flex min-h-screen w-full flex-col bg-muted/40 md:flex-row">
            <Sidebar session={session} />
            
            <div className="flex flex-1 flex-col">
                {/* 4. Añade el Header aquí */}
                <Header />
                
                <main className="flex-1 p-4 md:p-6">
                    {children}
                </main>
            </div>
            
            <Toaster />
        </div>
    </NotificationProvider>
  );
}