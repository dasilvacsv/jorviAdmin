import { db } from '@/lib/db';
import { raffles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { RaffleDetailView } from '@/components/rifas/raffle-detail-view'; // Asegúrate que esta ruta sea correcta
import { getTopBuyers } from '@/lib/actions'; // 1. IMPORTA la nueva server action

export const revalidate = 0;

export default async function RaffleDetailPage({ params }: { params: { id: string } }) {
  const raffleId = params.id;

  // 2. OBTÉN LOS DATOS DE LA RIFA (CON TICKETS COMPLETOS)
  const raffle = await db.query.raffles.findFirst({
    where: eq(raffles.id, raffleId),
    with: {
      images: true,
      purchases: {
        orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
      },
      // --- CAMBIO CLAVE ---
      // Necesitamos los datos completos de los tickets (número, estado, purchaseId)
      // para que la nueva tabla de datos pueda funcionar.
      // Por eso cambiamos la consulta a `true`.
      tickets: true,
      winnerTicket: {
        with: {
          purchase: true,
        },
      },
    },
  });

  if (!raffle) {
    notFound();
  }

  // 3. OBTÉN EL TOP DE COMPRADORES
  // Llamamos a la nueva acción que creamos para obtener el ranking.
  const topBuyersData = await getTopBuyers(raffleId);

  // 4. PASA AMBOS DATOS AL COMPONENTE CLIENTE
  // Ahora el componente recibe tanto la rifa como el top de compradores como props.
  return (
    <RaffleDetailView
      initialRaffle={raffle as any} // 'as any' para simplificar, puedes crear un tipo más estricto
      topBuyers={topBuyersData}
    />
  );
}