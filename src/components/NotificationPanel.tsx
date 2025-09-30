"use client";

import { useNotifications } from '@/contexts/NotificationContext';
import { X, Clock, CheckCircle2, Bell } from 'lucide-react';
import { useState } from 'react';
import { PurchaseDetailsModal } from '@/components/rifas/purchase-details-modal';

interface NotificationPanelProps {
    onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
    const { notifications, clearNotifications } = useNotifications();
    const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

    const handleNotificationClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPurchaseId(id);
    };

    const handleCloseModal = () => {
        setSelectedPurchaseId(null);
    };

    return (
        <>
            <div 
                className="fixed inset-0 bg-black bg-opacity-30 z-40"
                onClick={onClose}
            />
            
            <div className="absolute right-0 top-12 w-96 max-h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
                    <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                    <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                            <button
                                onClick={clearNotifications}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Limpiar
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No hay notificaciones</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={(e) => handleNotificationClick(notification.id, e)}
                                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                                        notification.isRead ? 'bg-white' : 'bg-blue-50'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 ${notification.isRead ? 'text-gray-400' : 'text-blue-600'}`}>
                                            {notification.isRead ? (
                                                <CheckCircle2 className="w-5 h-5" />
                                            ) : (
                                                <Clock className="w-5 h-5 animate-pulse" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {notification.buyerName || 'Anónimo'}
                                            </p>
                                            <p className="text-xs text-gray-600 truncate">
                                                {notification.buyerEmail}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                                <span className="font-medium text-green-600">
                                                    {notification.amount} {notification.raffle?.currency}
                                                </span>
                                                <span>•</span>
                                                <span>{notification.ticketCount} tickets</span>
                                            </div>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {new Date(notification.createdAt).toLocaleString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
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
