"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Purchase } from '@/components/rifas/purchase-details-modal';
import { useToast } from '@/hooks/use-toast';
import { checkForNewPurchases, getDashboardStats } from '@/lib/actions';

interface Notification extends Purchase {
    isRead: boolean;
}

interface DashboardStats {
    totalPendingPurchases: number;
    totalConfirmedToday: number;
    totalRevenueToday: number;
    activeRaffles: number;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    pendingCount: number;
    dashboardStats: DashboardStats;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
    isPollingActive: boolean;
    togglePolling: () => void;
    connectionStatus: 'connected' | 'connecting' | 'error';
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
        totalPendingPurchases: 0,
        totalConfirmedToday: 0,
        totalRevenueToday: 0,
        activeRaffles: 0
    });
    const [isPollingActive, setIsPollingActive] = useState(true);
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');
    
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();
    const originalTitleRef = useRef<string | null>(null);
    const lastCheckRef = useRef<Date>(new Date());
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const notificationIdsRef = useRef<Set<string>>(new Set());

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const pendingCount = notifications.filter(n => n.status === 'pending').length;

    // Actualizar título de la página
    useEffect(() => {
        if (typeof window !== 'undefined' && originalTitleRef.current === null) {
            originalTitleRef.current = document.title;
        }
        const baseTitle = originalTitleRef.current || 'Jorvi Admin';
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${baseTitle}`;
        } else {
            document.title = baseTitle;
        }
    }, [unreadCount]);

    // Cargar audio de notificación
    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio('/notification.mp3');
            audioRef.current.volume = 0.7;
            audioRef.current.load();
        }
    }, []);

    const markAsRead = useCallback((id: string) => {
        setNotifications(prev => 
            prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        notificationIdsRef.current.clear();
    }, []);

    const togglePolling = useCallback(() => {
        setIsPollingActive(prev => !prev);
    }, []);

    // Función para verificar nuevas compras
    const checkForUpdates = useCallback(async () => {
        if (!isPollingActive) return;

        try {
            setConnectionStatus('connecting');
            const newPurchases = await checkForNewPurchases(lastCheckRef.current.toISOString());
            
            if (newPurchases && newPurchases.length > 0) {
                console.log(`Encontradas ${newPurchases.length} nuevas compras pendientes`);
                
                // Filtrar solo las compras que no hemos visto antes
                const trulyNewPurchases = newPurchases.filter(
                    purchase => !notificationIdsRef.current.has(purchase.id)
                );

                if (trulyNewPurchases.length > 0) {
                    // Reproducir sonido de notificación
                    audioRef.current?.play().catch(console.error);

                    // Agregar nuevas notificaciones
                    const newNotifications = trulyNewPurchases.map(purchase => ({
                        ...purchase,
                        isRead: false
                    }));

                    setNotifications(prev => [...newNotifications, ...prev]);

                    // Marcar como vistas
                    trulyNewPurchases.forEach(purchase => {
                        notificationIdsRef.current.add(purchase.id);
                    });

                    // Mostrar toast con mejor información
                    const firstPurchase = trulyNewPurchases[0];
                    toast({
                        title: `🔔 ${trulyNewPurchases.length} Nuevo${trulyNewPurchases.length > 1 ? 's' : ''} Pago${trulyNewPurchases.length > 1 ? 's' : ''}`,
                        description: `${firstPurchase.buyerName || 'Cliente'} - ${firstPurchase.amount} ${firstPurchase.raffle?.currency || 'USD'}${trulyNewPurchases.length > 1 ? ` y ${trulyNewPurchases.length - 1} más` : ''}`,
                        duration: 5000,
                    });
                }
            }

            setConnectionStatus('connected');
            lastCheckRef.current = new Date();

        } catch (error) {
            console.error('Error al verificar nuevas compras:', error);
            setConnectionStatus('error');
            // En caso de error, pausamos el polling por 30 segundos
            setTimeout(() => {
                lastCheckRef.current = new Date();
                setConnectionStatus('connecting');
            }, 30000);
        }
    }, [isPollingActive, toast]);

    // Función para actualizar estadísticas del dashboard
    const updateDashboardStats = useCallback(async () => {
        try {
            const stats = await getDashboardStats();
            setDashboardStats(stats);
        } catch (error) {
            console.error('Error al actualizar estadísticas:', error);
        }
    }, []);

    // Configurar polling para notificaciones
    useEffect(() => {
        if (!isPollingActive) {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
            setConnectionStatus('error');
            return;
        }

        // Verificación inicial
        checkForUpdates();

        // Configurar intervalo de polling cada 10 segundos
        pollingIntervalRef.current = setInterval(checkForUpdates, 10000);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [checkForUpdates, isPollingActive]);

    // Configurar polling para estadísticas (cada 30 segundos)
    useEffect(() => {
        updateDashboardStats(); // Carga inicial
        statsIntervalRef.current = setInterval(updateDashboardStats, 30000);

        return () => {
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
                statsIntervalRef.current = null;
            }
        };
    }, [updateDashboardStats]);

    // Limpiar al desmontar el componente
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (statsIntervalRef.current) {
                clearInterval(statsIntervalRef.current);
            }
        };
    }, []);

    const value = { 
        notifications, 
        unreadCount, 
        pendingCount,
        dashboardStats,
        markAsRead, 
        markAllAsRead, 
        clearNotifications,
        isPollingActive,
        togglePolling,
        connectionStatus
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}