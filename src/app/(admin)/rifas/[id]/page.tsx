// app/rifas/[id]/page.tsx
import { db } from '@/lib/db';
import { raffles, systemSettings } from '@/lib/db/schema'; // ✅ Importa systemSettings
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { RaffleDetailView } from '@/components/rifas/raffle-detail-view';
import { getTopBuyers } from '@/lib/actions';

export const revalidate = 0;

export default async function RaffleDetailPage({ params }: { params: { id: string } }) {
  const raffleId = params.id;

  // 1. Obtén la rifa y sus relaciones
  const raffle = await db.query.raffles.findFirst({
    where: eq(raffles.id, raffleId),
    with: {
      images: true,
      purchases: {
        orderBy: (purchases, { desc }) => [desc(purchases.createdAt)],
      },
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

  // ✅ 2. OBTÉN LA TASA DE CAMBIO DEL SISTEMA
  const usdToVesRateRecord = await db.query.systemSettings.findFirst({
    where: eq(systemSettings.key, 'usd_to_ves_rate'),
  });
  const usdToVesRate = usdToVesRateRecord ? parseFloat(usdToVesRateRecord.value) : null;
  
  // 3. Obtén el top de compradores
  const topBuyersData = await getTopBuyers(raffleId);

  // ✅ 4. PASA LOS DATOS AL COMPONENTE CLIENTE
  return (
    <RaffleDetailView
      initialRaffle={raffle as any}
      topBuyers={topBuyersData}
      usdToVesRate={usdToVesRate} // ✅ Pasar la nueva prop
    />
  );
}