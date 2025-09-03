import { db } from '@/lib/db';
import { raffles, tickets } from '@/lib/db/schema';
import { desc, eq, or, and, gt } from 'drizzle-orm';
import Link from 'next/link';

// --- ICONS ---
import { Plus } from 'lucide-react';

// --- SHADCN/UI COMPONENTS ---
import { Button } from '@/components/ui/button';

// --- CUSTOM COMPONENTS ---
import { PaymentMethodsManager } from '@/components/admin/PaymentMethodsManager';
import { RafflesDataTable } from '@/components/admin/RafflesDataTable'; 

export default async function RafflesPage() {
    // La obtención de datos se mantiene igual, en el servidor
    const allRaffles = await db.query.raffles.findMany({
        orderBy: desc(raffles.createdAt),
        with: {
            images: { limit: 1 },
            tickets: {
                where: or(
                    eq(tickets.status, 'sold'),
                    and(
                        eq(tickets.status, 'reserved'),
                        gt(tickets.reservedUntil, new Date())
                    )
                ),
                columns: { id: true },
            },
            winnerTicket: {
                with: {
                    purchase: {
                        columns: { buyerName: true },
                    },
                },
            },
        },
    });

    return (
        <div className="space-y-8">
            {/* --- HEADER --- */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Rifas</h1>
                    <p className="text-gray-600 mt-1">Crea, visualiza y administra todas tus rifas desde un solo lugar.</p>
                </div>
                <Link href="/rifas/nuevo">
                    <Button className="w-full sm:w-auto">
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva Rifa
                    </Button>
                </Link>
            </div>

            {/* --- RENDERIZAMOS EL COMPONENTE CLIENTE CON LOS DATOS --- */}
            <RafflesDataTable initialRaffles={allRaffles} />

            {/* --- PAYMENT METHODS --- */}
            <div>
                <PaymentMethodsManager />
            </div>
        </div>
    );
}