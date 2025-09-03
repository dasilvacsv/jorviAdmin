// app/dashboard/page.tsx

import { db } from '@/lib/db';
import { purchases, raffles } from '@/lib/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

// --- FUNCIÓN PARA OBTENER LOS DATOS DEL SERVIDOR ---
async function getDashboardData() {
    const [
      statsResult,
      pendingPurchasesList,
      topPurchasesList,
    ] = await Promise.all([
      // 1. Consulta de estadísticas
      db.select({
        totalPurchases: count(),
        pendingPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'pending' THEN 1 END)`.mapWith(Number),
        confirmedPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'confirmed' THEN 1 END)`.mapWith(Number),
        totalRevenueUsd: sql<number>`sum(CASE WHEN ${purchases.status} = 'confirmed' AND ${raffles.currency} = 'USD' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
        totalRevenueVes: sql<number>`sum(CASE WHEN ${purchases.status} = 'confirmed' AND ${raffles.currency} = 'VES' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
      })
      .from(purchases)
      .leftJoin(raffles, eq(purchases.raffleId, raffles.id)),
      
      // 2. Compras pendientes (limitado a 5 para el dashboard)
      db.query.purchases.findMany({
        where: eq(purchases.status, 'pending'),
        with: { raffle: { columns: { name: true, currency: true } } },
        orderBy: desc(purchases.createdAt),
        limit: 5,
      }),
  
      // 3. Top 5 compras con más tickets de todas las rifas
      db.query.purchases.findMany({
          orderBy: desc(purchases.ticketCount),
          limit: 5,
          with: { raffle: { columns: { name: true } } }
      })
    ]);
  
    const stats = statsResult[0] || { totalPurchases: 0, pendingPurchases: 0, confirmedPurchases: 0, totalRevenueUsd: 0, totalRevenueVes: 0 };
    
    return {
        stats: {
            totalPurchases: stats.totalPurchases,
            pendingPurchases: stats.pendingPurchases,
            confirmedPurchases: stats.confirmedPurchases,
        },
        revenueUsd: stats.totalRevenueUsd,
        revenueVes: stats.totalRevenueVes,
        pendingPurchasesList,
        topPurchasesList,
    };
}


export default async function DashboardPage() {
    const data = await getDashboardData();

    return (
        <div className="relative min-h-screen w-full bg-gradient-to-br from-gray-50 to-gray-200 text-gray-900 overflow-hidden">
            {/* --- Efectos de fondo sutiles para modo claro --- */}
            <div className="absolute top-0 left-0 -z-10 h-full w-full opacity-30">
                <div className="absolute -top-1/4 -left-1/4 h-[800px] w-[800px] rounded-full bg-indigo-500/10 filter blur-3xl animate-blob"></div>
                <div className="absolute -bottom-1/4 -right-1/4 h-[800px] w-[800px] rounded-full bg-emerald-500/10 filter blur-3xl animate-blob animation-delay-2000"></div>
            </div>

            {/* --- Botón flotante para crear rifa en móviles --- */}
            <div className="fixed bottom-6 right-6 z-50 lg:hidden">
                <Link href="/rifas/crear">
                    <Button size="icon" className="h-14 w-14 rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 transition-all">
                        <PlusCircle className="h-7 w-7 text-white" />
                    </Button>
                </Link>
            </div>
            
            {/* --- Botón fijo para crear rifa en desktop --- */}
            <div className="fixed top-8 right-8 z-50 hidden lg:block">
                 <Link href="/rifas">
                    <Button variant="outline" className="bg-white border-gray-200 hover:bg-gray-50 text-gray-800 shadow-md transition-all">
                        <PlusCircle className="mr-2 h-4 w-4 text-indigo-600" />
                        Crear Nueva Rifa
                    </Button>
                </Link>
            </div>
            
            {/* --- Renderizamos el componente de cliente con los datos --- */}
            <DashboardClient {...data} />
        </div>
    );
}