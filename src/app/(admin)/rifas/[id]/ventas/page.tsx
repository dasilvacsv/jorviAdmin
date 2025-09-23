// app/rifas/[id]/ventas/page.tsx

import { getSalesDataForRaffle } from '@/lib/actions';
import { RaffleSalesView } from '@/components/rifas/sales/raffle-sales-view';
import { notFound } from 'next/navigation';
import { RaffleSalesData } from '@/lib/types';

export const revalidate = 0; // Datos siempre frescos

export default async function RaffleSalesPage({ params }: { params: { id: string } }) {
    const raffleId = params.id;

    // Usamos la server action simplificada
    const initialSalesData: RaffleSalesData | null = await getSalesDataForRaffle(raffleId);

    if (!initialSalesData) {
        notFound();
    }

    // Pasamos los datos iniciales al componente cliente
    return (
        <RaffleSalesView initialSalesData={initialSalesData} />
    );
}