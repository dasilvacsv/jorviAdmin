// app/dashboard/page.tsx

// ... importaciones
import { tickets, purchases, raffles } from '@/lib/db/schema';
import { eq, count, desc, sql } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { db } from '@/db';

async function getDashboardData() {
    const [
      statsResult,
      pendingPurchasesList,
      topPurchasesList, // ✅ Consulta de top compras actualizada
    ] = await Promise.all([
      // 1. Consulta de estadísticas (sin cambios)
      db.select({
        totalPurchases: count(),
        pendingPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'pending' THEN 1 END)`.mapWith(Number),
        confirmedPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'confirmed' THEN 1 END)`.mapWith(Number),
        totalRevenueUsd: sql<number>`sum(CASE WHEN ${purchases.status} = 'confirmed' AND ${raffles.currency} = 'USD' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
        totalRevenueVes: sql<number>`sum(CASE WHEN ${purchases.status} = 'confirmed' AND ${raffles.currency} = 'VES' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
      })
      .from(purchases)
      .leftJoin(raffles, eq(purchases.raffleId, raffles.id)),
      
      // 2. Compras pendientes (sin cambios)
      db.query.purchases.findMany({
        where: eq(purchases.status, 'pending'),
        with: { 
            raffle: { columns: { name: true, currency: true } } 
        },
        orderBy: desc(purchases.createdAt),
        limit: 5,
      }),
 
      // 3. Top 5 compras (✅ CON TICKETS)
      db.query.purchases.findMany({
          orderBy: desc(purchases.ticketCount),
          limit: 5,
          with: { 
            raffle: { columns: { name: true } },
            tickets: { columns: { ticketNumber: true } } // ✅ AÑADIDO: Obtener los números de ticket
          }
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
    const primaryButtonClasses = "font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 transition-all duration-300 ease-in-out transform hover:scale-105";

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
            {/* --- Botón flotante para crear rifa en móviles (FAB) --- */}
            <div className="fixed bottom-6 right-6 z-50 lg:hidden">
                <Link href="/rifas/nuevo">
                    <Button size="icon" className={`h-14 w-14 rounded-full shadow-xl ${primaryButtonClasses}`}>
                        <PlusCircle className="h-7 w-7" />
                    </Button>
                </Link>
            </div>
            
            <main className="p-4 sm:p-6 lg:p-8">
                {/* --- Encabezado de la página --- */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Panel de Control</h1>
                        <p className="text-muted-foreground">Un resumen de la actividad reciente.</p>
                    </div>
                    <div className="hidden lg:block">
                             <Link href="/rifas/nuevo">
                                 <Button className={primaryButtonClasses}>
                                     <PlusCircle className="mr-2 h-4 w-4" />
                                     Crear Nueva Rifa
                                 </Button>
                             </Link>
                    </div>
                </div>
                
                {/* --- Renderizamos el componente de cliente con los datos --- */}
                <DashboardClient {...data} />
            </main>
        </div>
    );
}