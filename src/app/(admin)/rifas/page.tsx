// app/rifas/page.tsx

import { db } from '@/lib/db';
import { raffles, tickets, paymentMethods } from '@/lib/db/schema';
import { desc, eq, or, and, gt } from 'drizzle-orm';
import { RafflesPageClient } from './RafflesPageClient'; // Se importará el componente cliente

// Este es el componente de servidor. Su única tarea es obtener datos.
export default async function RafflesPage() {
    // 1. Obtenemos TODOS los datos necesarios aquí.
    const [allRaffles, allPaymentMethods] = await Promise.all([
        db.query.raffles.findMany({
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
        }),
        db.query.paymentMethods.findMany({
            orderBy: (methods, { asc }) => [asc(methods.title)],
        }),
    ]);

    // 2. Renderizamos el componente cliente y le pasamos los datos como props.
    return (
        <RafflesPageClient 
            initialRaffles={allRaffles} 
            initialPaymentMethods={allPaymentMethods} 
        />
    );
}