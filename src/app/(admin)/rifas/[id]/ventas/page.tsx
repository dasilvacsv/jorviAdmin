// app/rifas/[id]/ventas/page.tsx

import { getPaginatedSales, getReferralOptionsForRaffle } from '@/lib/actions';
import { db } from '@/lib/db'; // Import Drizzle instance
import { raffles } from '@/lib/db/schema'; // Import schema
import { eq } from 'drizzle-orm';
import { RaffleSalesView } from '@/components/rifas/sales/raffle-sales-view';
import { notFound } from 'next/navigation';

export const revalidate = 0;

// ✨ Es una buena práctica crear una función que solo traiga los detalles de la rifa
async function getRaffleDetails(raffleId: string) {
    const raffle = await db.query.raffles.findFirst({
        where: eq(raffles.id, raffleId),
        columns: { id: true, name: true, currency: true, totalTickets: true /*... y otros campos que necesites ...*/ }
    });
    return raffle;
}

export default async function RaffleSalesPage({ params }: { params: { id: string } }) {
    const raffleId = params.id;

    // ✨ 1. Obtenemos solo los detalles de la rifa, NO todas las ventas.
    const raffle = await getRaffleDetails(raffleId);

    if (!raffle) {
        notFound();
    }
    
    // ✨ 2. Cargamos la PRIMERA PÁGINA de datos y las estadísticas iniciales en el servidor.
    const [initialFetch, referralOptions] = await Promise.all([
        getPaginatedSales(raffleId, {
            pageIndex: 0,
            pageSize: 50,
            sorting: [{ id: 'createdAt', desc: true }],
            globalFilter: '',
            columnFilters: [],
        }),
        getReferralOptionsForRaffle(raffleId) // ✨ Obtenemos la lista de filtros aquí
    ]);

    return (
        <RaffleSalesView
            raffle={raffle}
            initialData={initialFetch.rows}
            initialTotalRowCount={initialFetch.totalRowCount}
            initialStats={initialFetch.statistics}
            referralOptions={referralOptions} // ✨ Pasamos la lista como un nuevo prop
        />
    );
}