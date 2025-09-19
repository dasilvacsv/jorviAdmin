// app/rifas/RafflesPageClient.tsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import type { InferSelectModel } from 'drizzle-orm';
import { raffles, tickets, paymentMethods as paymentMethodsSchema } from '@/lib/db/schema';

// --- ICONS ---
import { Plus, Settings2 } from 'lucide-react';

// --- SHADCN/UI COMPONENTS ---
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// --- CUSTOM COMPONENTS ---
import { PaymentMethodsManager } from '@/components/admin/PaymentMethodsManager';
import { RafflesDataTable } from '@/components/admin/RafflesDataTable';

// --- TYPES ---
type RaffleWithDetails = InferSelectModel<typeof raffles> & {
    images: { url: string }[];
    tickets: { id: string }[];
    winnerTicket: { purchase: { buyerName: string | null } | null } | null;
};
type PaymentMethod = InferSelectModel<typeof paymentMethodsSchema>;

interface RafflesPageClientProps {
    initialRaffles: RaffleWithDetails[];
    initialPaymentMethods: PaymentMethod[];
}

export function RafflesPageClient({ initialRaffles, initialPaymentMethods }: RafflesPageClientProps) {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const primaryButtonClasses = "font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 transition-all";

    return (
        <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 lg:flex">
            
            {/* --- Contenido Principal (Izquierda) --- */}
            <main className="flex-1 p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Gestión de Rifas</h1>
                        <p className="text-muted-foreground mt-1">Crea, visualiza y administra tus rifas.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Botón para abrir el panel de pagos en móvil */}
                        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="icon" className="lg:hidden shrink-0">
                                    <Settings2 className="h-4 w-4" />
                                    <span className="sr-only">Gestionar Métodos de Pago</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="w-[340px] sm:w-[540px] p-0 flex flex-col">
                                <SheetHeader className="p-6 pb-4 border-b">
                                    <SheetTitle>Métodos de Pago</SheetTitle>
                                </SheetHeader>
                                <div className="flex-grow overflow-y-auto p-6">
                                     <PaymentMethodsManager initialPaymentMethods={initialPaymentMethods} />
                                </div>
                            </SheetContent>
                        </Sheet>
                        <Link href="/rifas/nuevo" className="w-full">
                            <Button className={`${primaryButtonClasses} w-full`}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Rifa
                            </Button>
                        </Link>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Todas las Rifas</CardTitle>
                        <CardDescription>Listado de rifas activas e históricas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RafflesDataTable initialRaffles={initialRaffles} />
                    </CardContent>
                </Card>
            </main>

            {/* --- Sidebar Derecha (Solo para Desktop) --- */}
            <aside className="hidden lg:flex flex-col w-[420px] border-l bg-background h-screen shrink-0">
                <div className="flex-grow p-6 overflow-y-auto">
                    <PaymentMethodsManager initialPaymentMethods={initialPaymentMethods} />
                </div>
            </aside>
            
        </div>
    );
}