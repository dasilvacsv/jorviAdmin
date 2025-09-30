"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Purchase } from '@/components/rifas/purchase-details-modal';
import { useToast } from '@/hooks/use-toast';
import io from 'socket.io-client';

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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
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
        // Conectar al servidor de WebSockets en tu dominio con el puerto 3001
        const socket = io("https://llevateloconjorvi.com:3001");

        socket.on("connect", () => {
            console.log("Conectado al servidor de notificaciones.");
        });

        // Escucha el evento 'new-purchase' que el servidor emite
        socket.on("new-purchase", (newPurchase: Purchase) => {
            // Si la notificación no existe en el estado local, la añadimos.
            if (!notificationIdsRef.current.has(newPurchase.id)) {
                audioRef.current?.play().catch(console.error);
                const newNotification = { ...newPurchase, isRead: false };
                setNotifications(prev => [newNotification, ...prev]);
                notificationIdsRef.current.add(newPurchase.id);
                
                toast({
                    title: `🔔 Nuevo(s) Pago(s) Recibido(s)`,
                    description: `${newPurchase.buyerName || 'Anónimo'} ha enviado un pago.`,
                });
            }
        });

        socket.on("disconnect", () => {
            console.log("Desconectado del servidor de notificaciones.");
        });

        // Limpiar la conexión cuando el componente se desmonta
        return () => {
            socket.disconnect();
        };
    }, [toast]); // Dependencia del hook useToast

    const value = { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}