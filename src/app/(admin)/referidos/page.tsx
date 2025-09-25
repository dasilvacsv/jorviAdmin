// app/admin/referidos/page.tsx

import { db } from "@/lib/db";
import { referralLinks, raffles } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ReferralLinksClient } from "./ReferralLinksClient";

export default async function ReferralLinksPage() {
    // --- MODIFICADO: Hacemos dos consultas en paralelo ---
    const [links, activeRaffles] = await Promise.all([
        db.query.referralLinks.findMany({
            orderBy: desc(referralLinks.createdAt),
        }),
        // --- NUEVO: Obtenemos solo las rifas activas ---
        db.query.raffles.findMany({
            where: eq(raffles.status, "active"),
            columns: {
                name: true,
                slug: true,
            },
            orderBy: desc(raffles.createdAt),
        })
    ]);

    return (
        <div className="container mx-auto py-10">
            <h1 className="text-3xl font-bold mb-6">Gestionar Links de Referidos</h1>
            {/* --- MODIFICADO: Pasamos las rifas activas al componente cliente --- */}
            <ReferralLinksClient initialLinks={links} initialRaffles={activeRaffles} />
        </div>
    );
}