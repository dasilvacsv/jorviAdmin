// app/dashboard/page.tsx

import { tickets, purchases, raffles } from '@/lib/db/schema';
import { eq, count, desc, sql, sum, and, isNotNull, ne } from 'drizzle-orm';
import { DashboardClient } from './dashboard-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { db } from '@/db';
import { ExportCustomersButton } from '@/components/dashboard/ExportCustomersButton';

async function getDashboardData() {
    const [
        statsResult,
        pendingPurchasesList,
        topBuyersList,
    ] = await Promise.all([
        // 🚨 CAMBIO APLICADO AQUÍ: Consulta de estadísticas generales. Ahora SOLO cuenta compras de rifas 'active'.
        db.select({
            totalPurchases: count(),
            pendingPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'pending' THEN 1 END)`.mapWith(Number),
            confirmedPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'confirmed' THEN 1 END)`.mapWith(Number),
            rejectedPurchases: sql<number>`count(CASE WHEN ${purchases.status} = 'rejected' THEN 1 END)`.mapWith(Number),
            totalRevenueUsd: sql<number>`sum(CASE WHEN ${purchases.status} = 'confirmed' AND ${raffles.currency} = 'USD' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
            totalRevenueVes: sql<number>`sum(CASE WHEN ${purchases.status} = 'confirmed' AND ${raffles.currency} = 'VES' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
        })
        .from(purchases)
        // Se usa INNER JOIN (o LEFT JOIN) y se añade un `where`
        .leftJoin(raffles, eq(purchases.raffleId, raffles.id))
        .where(eq(raffles.status, 'active')), // <-- 🎯 ¡ESTE ES EL CAMBIO!
        
        // Consulta de compras pendientes (SIN CAMBIOS, es importante ver todas las pendientes)
        db.query.purchases.findMany({
            where: eq(purchases.status, 'pending'),
            with: { 
                raffle: { columns: { name: true, currency: true } },
                tickets: { columns: { ticketNumber: true } }
            },
            orderBy: desc(purchases.createdAt),
            limit: 5,
        }),

        // LÓGICA DE TOP COMPRADORES (YA FUE MODIFICADA PREVIAMENTE)
        db.select({
            buyerName: sql<string>`max(${purchases.buyerName})`.as('buyer_name'),
            buyerEmail: sql<string>`max(${purchases.buyerEmail})`.as('buyer_email'),
            buyerPhone: purchases.buyerPhone,
            totalTickets: sql<number>`sum(${purchases.ticketCount})`.mapWith(Number),
            totalAmountUsd: sql<number>`sum(CASE WHEN ${raffles.currency} = 'USD' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
            totalAmountVes: sql<number>`sum(CASE WHEN ${raffles.currency} = 'VES' THEN ${purchases.amount}::decimal ELSE 0 END)`.mapWith(Number),
        })
        .from(purchases)
        // Usamos innerJoin para asegurar que solo contamos compras de rifas existentes
        .innerJoin(raffles, eq(purchases.raffleId, raffles.id))
        // Esta sección ya tenía la condición `eq(raffles.status, 'active')`
        .where(and(
            eq(purchases.status, 'confirmed'),
            isNotNull(purchases.buyerPhone),
            ne(purchases.buyerPhone, ''),
            eq(raffles.status, 'active')
        ))
        .groupBy(purchases.buyerPhone)
        .orderBy(desc(sql`sum(${purchases.ticketCount})`))
        .limit(5),
    ]);

    const stats = statsResult[0] || { totalPurchases: 0, pendingPurchases: 0, confirmedPurchases: 0, rejectedPurchases: 0, totalRevenueUsd: 0, totalRevenueVes: 0 };
    
    return {
        stats: {
            totalPurchases: stats.totalPurchases,
            pendingPurchases: stats.pendingPurchases,
            confirmedPurchases: stats.confirmedPurchases,
            rejectedPurchases: stats.rejectedPurchases,
        },
        revenueUsd: stats.totalRevenueUsd,
        revenueVes: stats.totalRevenueVes,
        pendingPurchasesList,
        topBuyersList,
    };
}

// --- Componente de Página (Sin cambios) ---
export default async function DashboardPage() {
    const data = await getDashboardData();
    const primaryButtonClasses = "font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 transition-all duration-300 ease-in-out transform hover:scale-105";

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950">
            <div className="fixed bottom-6 right-6 z-50 lg:hidden">
                <Link href="/rifas/nuevo">
                    <Button size="icon" className={`h-14 w-14 rounded-full shadow-xl ${primaryButtonClasses}`}>
                        <PlusCircle className="h-7 w-7" />
                    </Button>
                </Link>
            </div>
            
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Panel de Control</h1>
                        <p className="text-muted-foreground">Un resumen de la actividad reciente.</p>
                    </div>
                    <div className="hidden lg:block">
                        <div className="flex items-center gap-2">
                            <ExportCustomersButton />
                            <Link href="/rifas/nuevo">
                                <Button className={primaryButtonClasses}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Crear Nueva Rifa
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
                
                <DashboardClient {...data} />
            </main>
        </div>
    );
}