// app/rifas/[id]/ventas/page.tsx

import { db } from '@/lib/db';
import { purchases, raffles } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getSalesForRaffle } from '@/lib/actions'; // Crearemos esta acción
import { RaffleSalesView } from '@/components/rifas/sales/raffle-sales-view'; // Crearemos este componente

export const revalidate = 0; // Para que los datos de ventas siempre estén frescos

export default async function RaffleSalesPage({ params }: { params: { id: string } }) {
  const raffleId = params.id;

  // Usamos una nueva server action para obtener todas las ventas y datos de la rifa
  const salesData = await getSalesForRaffle(raffleId);

  if (!salesData) {
    notFound();
  }
  
  // Pasamos los datos iniciales al componente cliente que manejará toda la interactividad
  return (
    <RaffleSalesView initialSalesData={salesData} />
  );
}