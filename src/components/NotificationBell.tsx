"use client";

import { Bell, Pause, Play, Wifi, WifiOff, TriangleAlert as AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { NotificationPanel } from './NotificationPanel';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const { 
        unreadCount, 
        pendingCount, 
        markAllAsRead, 
        isPollingActive, 
        togglePolling, 
        connectionStatus,
        dashboardStats 
    } = useNotifications();

    const handleToggle = () => {
        if (!isOpen && unreadCount > 0) {
            markAllAsRead();
        }
        setIsOpen(!isOpen);
    };

    const getConnectionIcon = () => {
        switch (connectionStatus) {
            case 'connected':
                return <Wifi className="w-3 h-3 text-green-500" />;
            case 'connecting':
                return <Wifi className="w-3 h-3 text-yellow-500 animate-pulse" />;
            case 'error':
                return <WifiOff className="w-3 h-3 text-red-500" />;
            default:
                return <AlertTriangle className="w-3 h-3 text-gray-500" />;
        }
    };

    const getConnectionText = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'Conectado';
            case 'connecting':
                return 'Conectando...';
            case 'error':
                return 'Sin conexión';
            default:
                return 'Desconocido';
        }
    };

    return (
        <TooltipProvider>
            <div className="flex items-center gap-2 sm:gap-4">
                {/* Dashboard Stats - Solo visible en pantallas grandes */}
                <div className="hidden lg:flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full">
                        <span className="font-medium">{dashboardStats.activeRaffles}</span>
                        <span className="text-xs">Rifas Activas</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full">
                        <span className="font-medium">{dashboardStats.totalConfirmedToday}</span>
                        <span className="text-xs">Ventas Hoy</span>
                    </div>
                    {dashboardStats.totalRevenueToday > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full">
                            <span className="font-medium">${dashboardStats.totalRevenueToday.toFixed(0)}</span>
                            <span className="text-xs">Ingresos Hoy</span>
                        </div>
                    )}
                </div>

                {/* Control de Polling */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={togglePolling}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                        >
                            {isPollingActive ? (
                                <Pause className="h-4 w-4 text-orange-600" />
                            ) : (
                                <Play className="h-4 w-4 text-green-600" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{isPollingActive ? 'Pausar' : 'Reanudar'} monitoreo</p>
                    </TooltipContent>
                </Tooltip>

                {/* Indicador de estado de conexión */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gray-50">
                            {getConnectionIcon()}
                            <span className="text-xs font-medium text-gray-600 hidden sm:inline">
                                {getConnectionText()}
                            </span>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <div className="text-center">
                            <p className="font-medium">{getConnectionText()}</p>
                            <p className="text-xs text-gray-500">
                                {isPollingActive ? 'Monitoreando compras en tiempo real' : 'Monitoreo pausado'}
                            </p>
                        </div>
                    </TooltipContent>
                </Tooltip>

                {/* Contador de pendientes */}
                {pendingCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Compras pendientes por revisar</p>
                        </TooltipContent>
                    </Tooltip>
                )}

                {/* Botón de notificaciones */}
                <div className="relative">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleToggle}
                                className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                <Bell className="w-5 h-5" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform bg-red-600 rounded-full animate-pulse min-w-[20px] h-5">
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </span>
                                )}
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>
                                {unreadCount > 0 
                                    ? `${unreadCount} notificación${unreadCount > 1 ? 'es' : ''} nueva${unreadCount > 1 ? 's' : ''}`
                                    : 'No hay notificaciones nuevas'
                                }
                            </p>
                        </TooltipContent>
                    </Tooltip>

                    {isOpen && (
                        <NotificationPanel onClose={() => setIsOpen(false)} />
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}