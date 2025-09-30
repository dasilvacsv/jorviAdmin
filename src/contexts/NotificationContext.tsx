"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Purchase } from '@/components/rifas/purchase-details-modal';
import { checkForNewPurchases } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface Notification extends Purchase {
    isRead: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

const POLLING_INTERVAL_MS = 5000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const lastCheckRef = useRef<string>(new Date().toISOString());
    const [isChecking, setIsChecking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const { toast } = useToast();
    const originalTitleRef = useRef<string | null>(null);
    const notificationIdsRef = useRef<Set<string>>(new Set());

    const unreadCount = notifications.filter(n => !n.isRead).length;

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

        return () => {
            if (originalTitleRef.current) {
                document.title = originalTitleRef.current;
            }
        };
    }, [unreadCount]);

    useEffect(() => {
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio('/notification.mp3');
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

    useEffect(() => {
        const performCheck = async () => {
            if (isChecking) return;
            setIsChecking(true);

            try {
                const newTimestamp = new Date().toISOString();
                const fetchedPurchases = await checkForNewPurchases(lastCheckRef.current);
                lastCheckRef.current = newTimestamp;

                if (fetchedPurchases?.length > 0) {
                    const trulyNewPurchases = fetchedPurchases.filter(p => !notificationIdsRef.current.has(p.id));
                    
                    if (trulyNewPurchases.length > 0) {
                        audioRef.current?.play().catch(console.error);
                        
                        const newNotifications = trulyNewPurchases.map(p => ({ ...p, isRead: false }));
                        setNotifications(prev => [...newNotifications, ...prev]);
                        
                        trulyNewPurchases.forEach(p => notificationIdsRef.current.add(p.id));
                        
                        toast({
                            title: `🔔 ${trulyNewPurchases.length} Nuevo(s) Pago(s) Recibido(s)`,
                            description: `${trulyNewPurchases[0].buyerName || 'Anónimo'} ha enviado un pago.`,
                        });
                    }
                }
            } catch (error) {
                console.error("Error en el polling de notificaciones:", error);
            } finally {
                setIsChecking(false);
            }
        };

        const intervalId = setInterval(performCheck, POLLING_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [isChecking, toast]);

    const value = { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
