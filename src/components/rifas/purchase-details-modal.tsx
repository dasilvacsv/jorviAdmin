// components/PurchaseDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFormStatus } from "react-dom";
import {
    Check, X, Eye, Receipt, User, Mail, Phone, Ticket, DollarSign,
    CreditCard, Hash, ImageIcon, ExternalLink, Loader2
} from "lucide-react";
import Image from "next/image";
import { updatePurchaseStatusAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useFormState } from "react-dom";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- TIPOS Y COMPONENTES AUXILIARES ---

interface Purchase {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    buyerPhone: string | null;
    ticketCount: number;
    amount: string;
    paymentMethod: string | null;
    paymentReference: string | null;
    paymentScreenshotUrl: string | null;
    status: string;
}

interface PurchaseDetailsModalProps {
    purchase: Purchase;
    raffleCurrency: 'USD' | 'VES';
}

function SubmitButton({ children, newStatus, disabled }: { children: React.ReactNode; newStatus: "confirmed" | "rejected", disabled?: boolean }) {
    const { pending } = useFormStatus();
    const isConfirm = newStatus === 'confirmed';
    return (
        <Button
            type="submit"
            disabled={pending || disabled}
            className={`w-full sm:w-auto ${isConfirm ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
            variant={isConfirm ? 'default' : 'destructive'}
        >
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isConfirm ? <Check className="mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />)}
            {children}
        </Button>
    );
}

function CompactInfoDetail({ icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
    const Icon = icon;
    return (
        <div className="flex items-center justify-between text-sm py-2 border-b border-slate-200 last:border-b-0">
            <div className="flex items-center gap-2 text-slate-600">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>
            <span className="font-semibold text-slate-800 break-all text-right">
                {value || <span className="italic text-slate-400">N/A</span>}
            </span>
        </div>
    );
}

// --- COMPONENTE PRINCIPAL ---
export function PurchaseDetailsModal({ purchase, raffleCurrency }: PurchaseDetailsModalProps) {
    const [open, setOpen] = useState(false);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<'invalid_payment' | 'malicious' | ''>('');
    const [rejectionComment, setRejectionComment] = useState('');

    const [state, formAction] = useFormState(updatePurchaseStatusAction, { success: false, message: "" });
    const { toast } = useToast();

    useEffect(() => {
        if (state.message) {
            setOpen(false);
            setRejectionDialogOpen(false);
            toast({
                title: state.success ? "Éxito" : "Error",
                description: state.message,
                variant: state.success ? "default" : "destructive",
            });
            if (state.success) {
                setRejectionReason('');
                setRejectionComment('');
            }
        }
    }, [state, toast]);

    const formatCurrency = (amount: string, currency: 'USD' | 'VES') => {
        const value = parseFloat(amount).toFixed(2);
        return currency === 'USD' ? `$${value}` : `Bs. ${value}`;
    };

    const isRejectButtonDisabled = !rejectionReason || (rejectionReason === 'malicious' && rejectionComment.trim() === '');
    const canBeConfirmed = !!purchase.paymentScreenshotUrl;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" />Ver Detalles</Button>
            </DialogTrigger>
            {/* ✅ CAMBIOS CLAVE PARA RESPONSIVE Y SCROLL:
              1. max-w-* mejorado: Se ajusta mejor en tablets (sm, md) y pantallas grandes (lg).
              2. max-h-[90vh]: Limita la altura máxima del modal al 90% de la altura de la pantalla.
              3. flex flex-col: Convierte el contenido del modal en un contenedor flex vertical.
            */}
            <DialogContent className="max-w-md sm:max-w-2xl lg:max-w-6xl w-full p-0 max-h-[90vh] flex flex-col">
                <DialogHeader className="p-6 pb-4 border-b">
                    <DialogTitle className="text-2xl flex items-center gap-3">
                        <Receipt className="h-6 w-6 text-orange-500" />
                        Detalles de la Compra
                    </DialogTitle>
                </DialogHeader>

                {/* ✅ Contenedor de scroll:
                  1. flex-1: Hace que este div ocupe todo el espacio vertical disponible entre el header y el footer.
                  2. overflow-y-auto: Muestra una barra de scroll vertical SÓLO si el contenido se desborda.
                */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* --- Panel 1: Info del Comprador --- */}
                        <Card className="shadow-none border border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <User className="h-5 w-5 text-orange-500" />
                                    Información del Comprador
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <CompactInfoDetail icon={User} label="Nombre" value={purchase.buyerName} />
                                <CompactInfoDetail icon={Mail} label="Email" value={purchase.buyerEmail} />
                                <CompactInfoDetail icon={Phone} label="Teléfono" value={purchase.buyerPhone} />
                            </CardContent>
                        </Card>

                        {/* --- Panel 2: Detalles de la Transacción --- */}
                        <Card className="shadow-none border border-slate-200">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Receipt className="h-5 w-5 text-orange-500" />
                                    Detalles de la Transacción
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-1">
                                <CompactInfoDetail icon={Ticket} label="Tickets" value={purchase.ticketCount} />
                                <CompactInfoDetail icon={DollarSign} label="Monto" value={formatCurrency(purchase.amount, raffleCurrency)} />
                                <CompactInfoDetail icon={CreditCard} label="Método" value={purchase.paymentMethod} />
                                <CompactInfoDetail icon={Hash} label="Referencia" value={purchase.paymentReference} />
                            </CardContent>
                        </Card>

                        {/* --- Panel 3: Comprobante de Pago (Primero en móvil) --- */}
                        <Card className="shadow-none border border-slate-200 order-first lg:order-last">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <ImageIcon className="h-5 w-5 text-orange-500" />
                                    Comprobante de Pago
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-dashed bg-slate-100 flex items-center justify-center">
                                    {purchase.paymentScreenshotUrl ? (
                                        <Image src={purchase.paymentScreenshotUrl} alt="Captura de pago" fill className="object-contain" />
                                    ) : (
                                        <div className="text-center text-gray-500 p-4">
                                            <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                                            <p className="text-sm">No se adjuntó imagen.</p>
                                        </div>
                                    )}
                                </div>
                                {purchase.paymentScreenshotUrl && (
                                    <a href={purchase.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer">
                                        <Button variant="outline" className="w-full">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Ver en tamaño completo
                                        </Button>
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* --- Footer con Acciones --- */}
                <DialogFooter className="p-4 border-t flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white">
                    {purchase.status === 'pending' ? (
                        <>
                            <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button type="button" variant="destructive"><X className="h-4 w-4 mr-2" /> Rechazar</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                    <DialogHeader>
                                        <DialogTitle>Motivo del Rechazo</DialogTitle>
                                        <DialogDescription>Selecciona un motivo. Se notificará al comprador.</DialogDescription>
                                    </DialogHeader>
                                    <form action={formAction} className="space-y-4">
                                        <input type="hidden" name="purchaseId" value={purchase.id} />
                                        <input type="hidden" name="newStatus" value="rejected" />
                                        <RadioGroup name="rejectionReason" required value={rejectionReason} onValueChange={(v: any) => setRejectionReason(v)}>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="invalid_payment" id="r1" />
                                                <Label htmlFor="r1">Pago inválido o incompleto</Label>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <RadioGroupItem value="malicious" id="r2" />
                                                <Label htmlFor="r2">Actividad sospechosa o fraudulenta</Label>
                                            </div>
                                        </RadioGroup>
                                        {rejectionReason === 'malicious' && (
                                            <Textarea placeholder="Comentario obligatorio..." id="rejectionComment" name="rejectionComment" value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)} />
                                        )}
                                        <DialogFooter>
                                            <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                                            <SubmitButton newStatus="rejected" disabled={isRejectButtonDisabled}>Rechazar y Notificar</SubmitButton>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <AlertDialog>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className={!canBeConfirmed ? 'cursor-not-allowed w-full sm:w-auto' : 'w-full sm:w-auto'}>
                                                <AlertDialogTrigger asChild>
                                                    <Button type="button" disabled={!canBeConfirmed} className="w-full bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed">
                                                        <Check className="h-4 w-4 mr-2" /> Confirmar
                                                    </Button>
                                                </AlertDialogTrigger>
                                            </div>
                                        </TooltipTrigger>
                                        {!canBeConfirmed && (
                                            <TooltipContent>
                                                <p>Se requiere un comprobante para confirmar.</p>
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Confirmar esta compra?</AlertDialogTitle>
                                        <AlertDialogDescription>Se asignarán los tickets al comprador. Esta acción no se puede deshacer.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <form action={formAction} className="w-full sm:w-auto">
                                            <input type="hidden" name="purchaseId" value={purchase.id} />
                                            <input type="hidden" name="newStatus" value="confirmed" />
                                            <AlertDialogAction asChild><SubmitButton newStatus="confirmed">Sí, confirmar</SubmitButton></AlertDialogAction>
                                        </form>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : (
                        <Button variant="outline" disabled className="w-full">
                            Compra ya {purchase.status === 'confirmed' ? 'confirmada' : 'rechazada'}.
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}