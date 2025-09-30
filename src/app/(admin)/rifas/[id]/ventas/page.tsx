// app/rifas/[id]/ventas/page.tsx

// ✨ Se importa la nueva server action
import { getSalesDataForRaffle, getPaginatedSales } from '@/lib/actions';
import { RaffleSalesView } from '@/components/rifas/sales/raffle-sales-view';
import { notFound } from 'next/navigation';
import { RaffleSalesData } from '@/lib/types';

export const revalidate = 0;

export default async function RaffleSalesPage({ params }: { params: { id: string } }) {
    const raffleId = params.id;

    // ♻️ Ya no traemos TODAS las ventas, solo la información básica de la rifa.
    const raffleData = await getSalesDataForRaffle(raffleId);

    if (!raffleData || !raffleData.raffle) {
        notFound();
    }
    
    // ✨ Cargamos solo la PRIMERA PÁGINA de datos en el servidor.
    // Esto hace que la carga inicial sea increíblemente rápida.
    const initialPaginationData = await getPaginatedSales(raffleId, {
        pageIndex: 0,
        pageSize: 50, // Carga inicial de 50 filas
        sorting: [{ id: 'createdAt', desc: true }],
        globalFilter: '',
        columnFilters: [],
    });

    // Pasamos los datos de la rifa y los datos de la primera página al componente cliente
    return (
        <RaffleSalesView
            raffleData={raffleData}
            initialData={initialPaginationData.rows}
            initialPageCount={initialPaginationData.pageCount}
            initialTotalRowCount={initialPaginationData.totalRowCount}
        />
    );
}