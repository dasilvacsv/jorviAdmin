"use client";

import { useEffect, useRef, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { PurchaseDetailsModal } from './rifas/purchase-details-modal'; // Asegúrate que la ruta sea correcta y exporta el tipo Purchase
import { BellRing } from 'lucide-react';
import { checkForNewPurchases } from '@/lib/actions'; // Importamos la nueva Server Action

const POLLING_INTERVAL_MS = 500; // 0.5 segundos

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    // Usamos useRef para almacenar la fecha de la última revisión.
    // Esto evita que el intervalo se reinicie si el componente se re-renderiza.
    const lastCheckRef = useRef<string>(new Date().toISOString());
    
    // Estado para evitar que se ejecuten varias peticiones a la vez
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        // Inicializamos el audio
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio('/notification.mp3');
            audioRef.current.load();
        }

        const performCheck = async () => {
            if (isChecking) return; // Si ya hay una revisión en curso, no hacemos nada

            setIsChecking(true);
            try {
                const newTimestamp = new Date().toISOString();
                const newPurchases = await checkForNewPurchases(lastCheckRef.current);
                
                // Actualizamos el timestamp ANTES de mostrar las notificaciones
                lastCheckRef.current = newTimestamp;

                if (newPurchases && newPurchases.length > 0) {
                    console.log(`🔔 Se encontraron ${newPurchases.length} nuevas compras.`);
                    
                    // Reproducimos el sonido solo una vez, incluso si llegan varias compras
                    audioRef.current?.play().catch(e => console.error("Error al reproducir sonido:", e));

                    // Mostramos una notificación por cada compra nueva
                    newPurchases.forEach((purchase) => {
                        toast({
                            duration: 20000,
                            className: "border-orange-500 bg-orange-50 text-orange-900",
                            title: (
                                <div className="flex items-center gap-2">
                                    <BellRing className="h-5 w-5" />
                                    <span className="font-bold">¡Nuevo Pago Recibido!</span>
                                </div>
                            ),
                            description: `De ${purchase.buyerName || 'N/A'} por ${purchase.amount} USD.`,
                            action: <PurchaseDetailsModal purchase={purchase} />,
                        });
                    });
                }
            } catch (error) {
                console.error("Error en el ciclo de polling:", error);
            } finally {
                setIsChecking(false);
            }
        };

        // Creamos el intervalo que ejecutará la revisión periódicamente
        const intervalId = setInterval(performCheck, POLLING_INTERVAL_MS);

        // Limpieza: es MUY importante limpiar el intervalo cuando el componente se desmonte
        return () => {
            clearInterval(intervalId);
        };
    }, [isChecking, toast]); // Las dependencias del efecto

    return <>{children}</>;
}