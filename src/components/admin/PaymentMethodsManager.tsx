// components/admin/PaymentMethodsManager.tsx
"use client";

import type { InferSelectModel } from "drizzle-orm";
import { paymentMethods as paymentMethodsSchema } from "@/lib/db/schema";
import { createPaymentMethodAction, updatePaymentMethodAction, deletePaymentMethodAction } from "@/lib/actions";
import Image from "next/image";
import { motion } from "framer-motion";

// --- SHADCN/UI & ICONS ---
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Edit, Plus, AlertTriangle, ImageIcon, Trash2 } from "lucide-react";
import { PaymentMethodDialog } from "./PaymentMethodDialog";
import { DeleteMethodDialog } from "./DeleteMethodDialog";

// --- TYPES ---
type PaymentMethod = InferSelectModel<typeof paymentMethodsSchema>;
interface PaymentMethodsManagerProps {
    initialPaymentMethods: PaymentMethod[];
}

// --- SUB-COMPONENTES PARA MAYOR CLARIDAD Y REUTILIZACIÓN ---

const StatusBadge = ({ isActive }: { isActive: boolean }) => (
    <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20 shrink-0" : "shrink-0"}>
        {isActive ? "Activo" : "Inactivo"}
    </Badge>
);

function MethodDetails({ method }: { method: PaymentMethod }) {
    const details = [
        { label: "Titular", value: method.accountHolderName }, { label: "Banco", value: method.bankName },
        { label: "RIF/CI", value: method.rif }, { label: "N° Cuenta", value: method.accountNumber },
        { label: "Teléfono", value: method.phoneNumber }, { label: "Correo", value: method.email },
        { label: "Wallet", value: method.walletAddress }, { label: "Red", value: method.network },
        { label: "Binance Pay ID", value: method.binancePayId },
    ].filter(detail => detail.value);

    if (details.length === 0) {
        return <p className="text-sm text-muted-foreground p-4 text-center">Sin detalles adicionales configurados.</p>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 p-4">
            {details.map(d => (
                <div key={d.label}>
                    <p className="font-semibold text-foreground text-sm">{d.label}</p>
                    <p className="text-muted-foreground break-words text-sm">{d.value}</p>
                </div>
            ))}
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function PaymentMethodsManager({ initialPaymentMethods }: PaymentMethodsManagerProps) {
    const primaryButtonClasses = "font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 transition-all";

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="flex flex-col h-full">
            <motion.header 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-6"
            >
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <CreditCard className="h-6 w-6" />
                    Métodos de Pago
                </h2>
                <p className="text-muted-foreground mt-1">
                    Configura los medios para recibir pagos.
                </p>
            </motion.header>
            
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="mb-6"
            >
                 <PaymentMethodDialog
                    action={createPaymentMethodAction}
                    triggerButton={
                        <Button className={`w-full ${primaryButtonClasses}`}>
                            <Plus className="h-4 w-4 mr-2" />
                            Añadir Nuevo Método
                        </Button>
                    }
                />
            </motion.div>

            {initialPaymentMethods.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="flex flex-col flex-grow items-center justify-center text-center p-8 border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/50"
                >
                    <AlertTriangle className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-semibold">No has añadido métodos de pago</h3>
                    <p className="text-muted-foreground mt-1 text-sm">Añade al menos un método para continuar.</p>
                </motion.div>
            ) : (
                <motion.div 
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="border-t pt-4"
                >
                    <Accordion type="single" collapsible className="w-full space-y-2">
                        {initialPaymentMethods.map(method => (
                            <motion.div key={method.id} variants={itemVariants}>
                                <AccordionItem value={method.id} className="border rounded-md hover:border-primary/50 hover:shadow-md transition-all duration-300">
                                    <AccordionTrigger className="px-4 py-3 text-left hover:no-underline">
                                        <div className="flex w-full items-center justify-between gap-4">
                                            {/* --- LADO IZQUIERDO: ICONO Y TEXTO --- */}
                                            <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                                {/* **SOLUCIÓN: Contenedor de tamaño fijo para el icono** */}
                                                <div className="h-10 w-10 flex items-center justify-center bg-muted/50 rounded-md border shrink-0">
                                                    {method.iconUrl ? 
                                                        <Image src={method.iconUrl} alt={method.title} width={32} height={32} className="object-contain" /> 
                                                        : 
                                                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                                    }
                                                </div>
                                                <div className="flex-1 truncate">
                                                    <p className="font-semibold truncate">{method.title}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{method.type}</p>
                                                </div>
                                            </div>
                                            {/* --- LADO DERECHO: BADGE DE ESTADO --- */}
                                            <div className="ml-2">
                                                <StatusBadge isActive={method.isActive} />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="border-t">
                                            <MethodDetails method={method} />
                                            <div className="flex justify-end gap-2 p-4 border-t bg-muted/30">
                                                <PaymentMethodDialog 
                                                    action={updatePaymentMethodAction} 
                                                    method={method} 
                                                    triggerButton={<Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Editar</Button>} 
                                                />
                                                <DeleteMethodDialog 
                                                    methodId={method.id} 
                                                    action={deletePaymentMethodAction} 
                                                    triggerButton={<Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" />Eliminar</Button>}
                                                />
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </motion.div>
                        ))}
                    </Accordion>
                </motion.div>
            )}
        </div>
    );
}