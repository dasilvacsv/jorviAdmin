// app/rifas/[id]/bingo/page.tsx
import { db } from '@/lib/db';
import { raffles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { BingoView } from '@/components/rifas/bingo-view';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// La revalidación en 0 asegura que los datos del bingo siempre estén actualizados.
export const revalidate = 0;

export default async function RaffleBingoPage({ params }: { params: { id: string } }) {
  const raffleId = params.id;

  // Hacemos una consulta optimizada para obtener solo lo que necesitamos:
  // La rifa y sus tickets, incluyendo la información de la compra (purchase) en cada ticket.
  const raffleWithTickets = await db.query.raffles.findFirst({
    where: eq(raffles.id, raffleId),
    with: {
      tickets: {
        // Incluimos la relación 'purchase' para saber quién compró cada ticket.
        with: {
          purchase: true,
        },
      },
    },
  });

  if (!raffleWithTickets) {
    notFound();
  }

  // Extraemos solo los datos que el componente cliente necesita.
  const { tickets, ...raffleInfo } = raffleWithTickets;

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" size="sm">
            <Link href={`/rifas/${raffleId}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Detalles de la Rifa
            </Link>
          </Button>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900">
                    Tablero de Tickets (Bingo)
                </CardTitle>
                <CardDescription>
                    Visualiza todos los tickets para la rifa "{raffleInfo.name}". Busca por número, nombre o email del comprador.
                </CardDescription>
            </CardHeader>
            <CardContent>
                 {/* Pasamos los datos al componente de cliente para la renderización interactiva */}
                <BingoView 
                    raffle={raffleInfo} 
                    initialTickets={tickets as any} 
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}