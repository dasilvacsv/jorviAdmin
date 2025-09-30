// app/admin/referidos/page.tsx
import { db } from "@/lib/db";
import { referrals, referralLinks, raffles } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { ReferralsAndLinksClient } from "./ReferralsAndLinksClient"; // ✅ Importa el nuevo componente unificado

export default async function ReferralsPage() {
    // ✅ Hacemos tres consultas en paralelo para obtener todos los datos necesarios
    const [accounts, campaignLinks, activeRaffles] = await Promise.all([
        // 1. Obtiene todas las cuentas de referidos
        db.query.referrals.findMany({
            orderBy: desc(referrals.createdAt),
        }),
        // 2. Obtiene todos los links de campaña
        db.query.referralLinks.findMany({
            orderBy: desc(referralLinks.createdAt),
        }),
        // 3. Obtiene las rifas activas para el generador de links de campaña
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
            <div className="flex justify-between items-center mb-6">
                 <h1 className="text-3xl font-bold">Gestión de Referidos y Campañas</h1>
            </div>
            
            {/* ✅ Pasamos todos los datos al nuevo componente cliente unificado */}
            <ReferralsAndLinksClient 
                initialReferrals={accounts} 
                initialCampaignLinks={campaignLinks}
                initialRaffles={activeRaffles}
            />
        </div>
    );
}