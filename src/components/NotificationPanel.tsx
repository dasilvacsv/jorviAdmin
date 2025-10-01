"use client";

import { useNotifications } from '@/contexts/NotificationContext';
import { X, Clock, CircleCheck as CheckCircle2, Bell, CircleAlert as AlertCircle, DollarSign, Ticket, User, Calendar, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { PurchaseDetailsModal } from '@/components/rifas/purchase-details-modal';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NotificationPanelProps {
    onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
    const { notifications, clearNotifications, pendingCount, dashboardStats } = useNotifications();
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

    const handleNotificationClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPurchaseId(id);
    };

    const handleCloseModal = () => {
        setSelectedPurchaseId(null);
    };

    const getStatusIcon = (status: string, isRead: boolean) => {
        const baseClasses = "w-4 h-4 flex-shrink-0";
        switch (status) {
            case 'pending':
                return <AlertCircle className={`${baseClasses} ${isRead ? 'text-orange-400' : 'text-orange-600 animate-pulse'}`} />;
            case 'confirmed':
                return <CheckCircle2 className={`${baseClasses} text-green-600`} />;
            case 'rejected':
                return <X className={`${baseClasses} text-red-600`} />;
            default:
                return <Clock className={`${baseClasses} ${isRead ? 'text-gray-400' : 'text-blue-600'}`} />;
        }
    };

    const getStatusColor = (status: string, isRead: boolean) => {
        if (isRead) return 'bg-white border-l-gray-300';
        
        switch (status) {
            case 'pending':
                return 'bg-orange-50 border-l-orange-500 shadow-sm';
            case 'confirmed':
                return 'bg-green-50 border-l-green-500 shadow-sm';
            case 'rejected':
                return 'bg-red-50 border-l-red-500 shadow-sm';
            default:
                return 'bg-blue-50 border-l-blue-500 shadow-sm';
        }
    };

    const formatCurrency = (amount: string, currency?: string) => {
        const value = parseFloat(amount);
        if (currency === 'VES') {
            return `Bs. ${value.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
        }
        return `$${value.toFixed(2)}`;
    };

    const formatDate = (date: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Ahora mismo';
        if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
        if (diffInMinutes < 1440) return `Hace ${Math.floor(diffInMinutes / 60)} h`;
        return new Date(date).toLocaleDateString('es-ES', { 
            day: '2-digit', 
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden"
                onClick={onClose}
            />
            
            <div className="absolute right-0 top-12 w-full max-w-md md:w-96 max-h-[85vh] md:max-h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200 mx-4 md:mx-0">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                        <div className="flex items-center gap-2">
                            {notifications.length > 0 && (
                                <Button
                                    onClick={clearNotifications}
                                    variant="ghost"
                                    size="sm"
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 font-medium transition-colors"
                                >
                                    Limpiar
                                </Button>
                            )}
                            <Button
                                onClick={onClose}
                                variant="ghost"
                                size="sm"
                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors p-1"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    
                    {/* Stats Summary */}
                    <div className="flex flex-wrap gap-2 text-xs">
                        {pendingCount > 0 && (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
                            </Badge>
                        )}
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            {dashboardStats.activeRaffles} rifa{dashboardStats.activeRaffles !== 1 ? 's' : ''} activa{dashboardStats.activeRaffles !== 1 ? 's' : ''}
                        </Badge>
                        {dashboardStats.totalConfirmedToday > 0 && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {dashboardStats.totalConfirmedToday} venta{dashboardStats.totalConfirmedToday !== 1 ? 's' : ''} hoy
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">No hay notificaciones</p>
                            <p className="text-xs mt-1 text-gray-400">Las nuevas compras aparecerán aquí automáticamente</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={(e) => handleNotificationClick(notification.id, e)}
                                    className={`p-4 hover:bg-gray-50 transition-all cursor-pointer border-l-4 ${getStatusColor(notification.status, notification.isRead)} group`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1">
                                            {getStatusIcon(notification.status, notification.isRead)}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-2">
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    <p className="text-sm font-semibold text-gray-900 truncate">
                                                        {notification.buyerName || 'Cliente Anónimo'}
                                                    </p>
                                                </div>
                                                <Badge 
                                                    variant={notification.status === 'pending' ? 'secondary' : 'outline'}
                                                    className={`text-xs ${
                                                        notification.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                                                        notification.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}
                                                >
                                                    {notification.status === 'pending' ? 'Pendiente' :
                                                     notification.status === 'confirmed' ? 'Confirmada' : 'Rechazada'}
                                                </Badge>
                                            </div>

                                            {/* Email */}
                                            <p className="text-xs text-gray-600 truncate flex items-center gap-1">
                                                <Smartphone className="w-3 h-3" />
                                                {notification.buyerEmail}
                                            </p>

                                            {/* Purchase Details */}
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-3 text-gray-500">
                                                    <span className="flex items-center gap-1 font-medium text-green-600">
                                                        <DollarSign className="w-3 h-3" />
                                                        {formatCurrency(notification.amount, notification.raffle?.currency)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Ticket className="w-3 h-3" />
                                                        {notification.ticketCount} ticket{notification.ticketCount !== 1 ? 's' : ''}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Payment Method & Time */}
                                            <div className="flex items-center justify-between text-xs text-gray-400">
                                                <span className="truncate">
                                                    {notification.paymentMethod || 'Método no especificado'}
                                                </span>
                                                <span className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatDate(notification.createdAt)}
                                                </span>
                                            </div>

                                            {/* Raffle Name */}
                                            {notification.raffle?.name && (
                                                <p className="text-xs text-blue-600 font-medium truncate">
                                                    📦 {notification.raffle.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </div>

            {selectedPurchaseId && (
                <PurchaseDetailsModal
                    purchaseId={selectedPurchaseId}
                    isOpen={true}
                    onClose={handleCloseModal}
                />
            )}
        </>
    );
}