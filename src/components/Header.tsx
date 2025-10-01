"use client";

import { NotificationBell } from './NotificationBell';
import { useNotifications } from '@/contexts/NotificationContext';
import { Badge } from '@/components/ui/badge';

export function Header() {
    const { dashboardStats } = useNotifications();

    return (
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
            {/* Logo/Title - Solo visible en móvil */}
            <div className="flex items-center gap-2 md:hidden">
                <h1 className="text-lg font-semibold text-gray-900">Jorvi Admin</h1>
            </div>

            {/* Stats rápidas - Solo visible en tablet */}
            <div className="hidden md:flex lg:hidden items-center gap-3">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {dashboardStats.activeRaffles} Rifas
                </Badge>
                <Badge variant="secondary" className="bg-green-50 text-green-700">
                    {dashboardStats.totalConfirmedToday} Ventas
                </Badge>
                {dashboardStats.totalPendingPurchases > 0 && (
                    <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                        {dashboardStats.totalPendingPurchases} Pendientes
                    </Badge>
                )}
            </div>

            {/* Notification Bell */}
            <NotificationBell />
        </header>
    );
}