"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// UI Components
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

// Hooks & Actions
import { useFormStatus, useFormState } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { updatePurchaseStatusAction, updatePurchaseInfoAction, getSaleDetails } from "@/lib/actions";
import { type Purchase } from "@/lib/types";
// Icons
import {
    Check, X, Eye, Receipt, User, Mail, Phone, Ticket, DollarSign,
    CreditCard, Hash, ImageIcon, ExternalLink, Loader2, Edit, Save,
    AlertTriangle
} from "lucide-react";
import Image from "next/image";


interface PurchaseDetailsModalProps {
    purchase?: Purchase; // Ahora usará el tipo importado
    purchaseId?: string;
    isOpen?: boolean;
    onClose?: () => void;
    raffleCurrency?: 'USD' | 'VES';
    similarReferences?: Purchase[]; // Ahora también usará el tipo importado
}

// --- COMPONENTES AUXILIARES ---

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

function EditableInfoDetail({ icon, label, value, onSave, type = "text", editable = false }: { icon: React.ElementType, label: string, value: React.ReactNode, onSave?: (newValue: string) => void, type?: "text" | "email" | "tel", editable?: boolean }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(typeof value === 'string' ? value : '');
    const Icon = icon;

    const handleSave = () => {
        if (onSave && editValue !== value) {
            onSave(editValue);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditValue(typeof value === 'string' ? value : '');
        setIsEditing(false);
    };

    return (
        <div className="flex items-center justify-between text-sm py-2 border-b border-slate-200 last:border-b-0 group">
            <div className="flex items-center gap-2 text-slate-600">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
                {isEditing ? (
                    <>
                        <Input type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 text-sm max-w-[200px]" autoFocus />
                        <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0"><Save className="h-4 w-4 text-green-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0"><X className="h-4 w-4 text-red-600" /></Button>
                    </>
                ) : (
                    <>
                        <span className="font-semibold text-slate-800 break-all text-right">
                            {value || <span className="italic text-slate-400">N/A</span>}
                        </span>
                        {editable && (
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit className="h-4 w-4" />
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
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

// --- FUNCIÓN AUXILIAR AÑADIDA ---
const getStatusBadge = (status: string) => {
    const statusMap = {
      confirmed: "bg-green-100 text-green-800 border-green-300",
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300", 
      rejected: "bg-red-100 text-red-800 border-red-300",
    };
    const textMap = { confirmed: 'Confirmado', pending: 'Pendiente', rejected: 'Rechazado' };
    
    if (!statusMap[status as keyof typeof statusMap]) return null;
    
    return <Badge className={`${statusMap[status as keyof typeof statusMap]} hover:bg-opacity-80`}>{textMap[status as keyof typeof textMap]}</Badge>;
};


export function PurchaseDetailsModal({
    purchase: initialPurchase,
    purchaseId,
    isOpen: controlledOpen,
    onClose,
    raffleCurrency: initialCurrency = 'USD',
    similarReferences: initialSimilarReferences = []
}: PurchaseDetailsModalProps) {
    const [open, setOpen] = useState(controlledOpen ?? false);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<'invalid_payment' | 'malicious' | ''>('');
    const [rejectionComment, setRejectionComment] = useState('');
    const [loading, setLoading] = useState(false);

    const [purchaseData, setPurchaseData] = useState<Purchase | null>(initialPurchase || null);
    const [raffleCurrency, setRaffleCurrency] = useState<'USD' | 'VES'>(initialCurrency);
    const [similarReferences, setSimilarReferences] = useState(initialSimilarReferences);

    const [state, formAction] = useFormState(updatePurchaseStatusAction, { success: false, message: "" });
    const { toast } = useToast();

    useEffect(() => {
        if (controlledOpen !== undefined) {
            setOpen(controlledOpen);
        }
    }, [controlledOpen]);

    useEffect(() => {
    const loadPurchaseData = async () => {
        // Esta función es para cuando el modal necesita buscar los datos por sí mismo
        if (purchaseId) {
            setLoading(true);
            try {
                const result = await getSaleDetails(purchaseId);
                if (result) {
                    setPurchaseData(result.purchase as Purchase);
                    setRaffleCurrency(result.purchase.raffle.currency);
                    setSimilarReferences(result.similarReferences as Purchase[]);
                } else {
                    toast({ title: "Error", description: "No se pudo cargar la información de la compra.", variant: "destructive" });
                }
            } catch (error) {
                console.error("Error loading purchase:", error);
                toast({ title: "Error", description: "Ocurrió un error al cargar los datos.", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        }
    };

    // Solo ejecutamos la lógica cuando el modal se abre (open es true)
    if (open) {
        if (initialPurchase) {
            // Si ya tenemos los datos (desde el dashboard), simplemente los establecemos en el estado.
            setPurchaseData(initialPurchase);
            setSimilarReferences(initialSimilarReferences);
            if(initialPurchase.raffle?.currency) {
                setRaffleCurrency(initialPurchase.raffle.currency);
            }
        } else if (purchaseId) {
            // Si no tenemos los datos pero sí un ID, los buscamos.
            loadPurchaseData();
        }
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [open]); // <-- ¡CAMBIO CLAVE! El efecto solo depende de 'open'.

    useEffect(() => {
        if (state.message) {
            const shouldClose = controlledOpen === undefined;
            if (shouldClose) {
                setOpen(false);
            } else if (onClose) {
                onClose();
            }
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
    }, [state, toast, controlledOpen, onClose]);

    const handleOpenChange = (newOpen: boolean) => {
        if (controlledOpen === undefined) {
            setOpen(newOpen);
        } else if (!newOpen && onClose) {
            onClose();
        }
    };

    const handleInfoUpdate = async (formData: FormData) => {
        const result = await updatePurchaseInfoAction({ success: false, message: '' }, formData);
        toast({
            title: result.success ? "Éxito" : "Error",
            description: result.message || (result.success ? "Información actualizada." : "No se pudo actualizar."),
            variant: result.success ? "default" : "destructive",
        });
        return result.success;
    };

    const handleEmailChange = async (newEmail: string) => {
        if (!purchaseData) return;
        const formData = new FormData();
        formData.append('purchaseId', purchaseData.id);
        formData.append('buyerEmail', newEmail);
        const success = await handleInfoUpdate(formData);
        if (success) setPurchaseData(prev => prev ? { ...prev, buyerEmail: newEmail } : null);
    };

    const handlePhoneChange = async (newPhone: string) => {
        if (!purchaseData) return;
        const formData = new FormData();
        formData.append('purchaseId', purchaseData.id);
        formData.append('buyerPhone', newPhone);
        const success = await handleInfoUpdate(formData);
        if (success) setPurchaseData(prev => prev ? { ...prev, buyerPhone: newPhone } : null);
    };

    const formatCurrency = (amount: string, currency: 'USD' | 'VES') => {
        const value = parseFloat(amount);
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    };

    const isRejectButtonDisabled = !rejectionReason || (rejectionReason === 'malicious' && rejectionComment.trim() === '');
    const hasSimilarReferences = similarReferences.length > 0;

    const dialogTrigger = controlledOpen === undefined ? (
        <DialogTrigger asChild>
            <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" />Ver Detalles</Button>
        </DialogTrigger>
    ) : null;

    if (!purchaseData && !loading && !open) {
        return dialogTrigger;
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {dialogTrigger}
            <DialogContent className="max-w-md sm:max-w-2xl lg:max-w-6xl w-full p-0 max-h-[90vh] flex flex-col">
                <TooltipProvider>
                    {loading ? (
                        <div className="p-6 flex items-center justify-center min-h-[400px]">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : purchaseData ? (
                        <>
                            <DialogHeader className="p-6 pb-4 border-b flex flex-row items-center justify-between">
                                <DialogTitle className="text-2xl flex items-center gap-3">
                                    <Receipt className="h-6 w-6 text-orange-500" />
                                    Detalles de la Compra
                                </DialogTitle>
                                <Button asChild variant="ghost" size="icon">
                                    <Link href={`/sale/${purchaseData.id}`} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-5 w-5" />
                                    </Link>
                                </Button>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                {/* --- ALERTA DE DUPLICADOS AÑADIDA --- */}
                                {hasSimilarReferences && (
                                    <Alert variant="destructive" className="mb-4">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle className="font-bold">¡Atención! Referencia similar detectada</AlertTitle>
                                        <AlertDescription>
                                            Se encontraron {similarReferences.length} compra(s) con una referencia de pago similar. Por favor, revisa los detalles a continuación para evitar confirmar una venta duplicada.
                                        </AlertDescription>
                                    </Alert>
                                )}
                                
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <Card className="shadow-none border border-slate-200">
                                        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-orange-500" /> Información del Comprador</CardTitle></CardHeader>
                                        <CardContent className="space-y-1">
                                            <CompactInfoDetail icon={User} label="Nombre" value={purchaseData.buyerName} />
                                            <EditableInfoDetail icon={Mail} label="Email" value={purchaseData.buyerEmail} type="email" onSave={handleEmailChange} editable={true} />
                                            <EditableInfoDetail icon={Phone} label="Teléfono" value={purchaseData.buyerPhone || ''} type="tel" onSave={handlePhoneChange} editable={true} />
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-none border border-slate-200">
                                        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Receipt className="h-5 w-5 text-orange-500" /> Detalles de la Transacción</CardTitle></CardHeader>
                                        <CardContent className="space-y-1">
                                            <CompactInfoDetail icon={Ticket} label="Tickets" value={purchaseData.ticketCount} />
                                            <CompactInfoDetail icon={DollarSign} label="Monto" value={formatCurrency(purchaseData.amount, raffleCurrency)} />
                                            <CompactInfoDetail icon={CreditCard} label="Método" value={purchaseData.paymentMethod} />

                                            <div className="flex items-center justify-between text-sm py-2">
                                                <div className="flex items-center gap-2 text-slate-600"><Hash className="h-4 w-4" /><span>Referencia</span></div>
                                                <div className="flex items-center gap-2">
                                                    <Tooltip delayDuration={100}>
                                                        <TooltipTrigger asChild>
                                                            <span className={`font-semibold break-all text-right font-mono cursor-help ${hasSimilarReferences ? 'text-red-500' : 'text-slate-800'}`}>
                                                                {purchaseData.paymentReference || <span className="italic text-slate-400 font-sans">N/A</span>}
                                                            </span>
                                                        </TooltipTrigger>
                                                        {hasSimilarReferences && (
                                                            <TooltipContent className="border-red-300 bg-red-50 text-red-900 max-w-xs" side="top">
                                                                <div className="flex items-start gap-2 p-1">
                                                                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                                    <p className="font-sans text-sm">Se encontraron otras compras con una referencia similar. Revisa la lista de abajo.</p>
                                                                </div>
                                                            </TooltipContent>
                                                        )}
                                                    </Tooltip>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="shadow-none border border-slate-200 order-first lg:order-last">
                                        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><ImageIcon className="h-5 w-5 text-orange-500" /> Comprobante de Pago</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="relative aspect-square w-full rounded-md overflow-hidden border-2 border-dashed bg-slate-100 flex items-center justify-center">
                                                {purchaseData.paymentScreenshotUrl ? (
                                                    <Image src={purchaseData.paymentScreenshotUrl} alt="Captura de pago" fill className="object-contain" />
                                                ) : (
                                                    <div className="text-center text-gray-500 p-4">
                                                        <ImageIcon className="h-10 w-10 mx-auto mb-2" />
                                                        <p className="text-sm">No se adjuntó imagen.</p>
                                                    </div>
                                                )}
                                            </div>
                                            {purchaseData.paymentScreenshotUrl && (
                                                <a href={purchaseData.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="outline" className="w-full"><ExternalLink className="h-4 w-4 mr-2" /> Ver en tamaño completo</Button>
                                                </a>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                                
                                {/* --- LISTA DE REFERENCIAS SIMILARES AÑADIDA --- */}
                                {hasSimilarReferences && (
                                    <Card className="mt-4 shadow-none border border-slate-200">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2 text-lg text-yellow-700">
                                                <AlertTriangle className="h-5 w-5" />
                                                Compras Similares Encontradas ({similarReferences.length})
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {similarReferences.map((similar) => (
                                                    <div key={similar.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                        <div className="space-y-1 flex-grow">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <p className="font-semibold text-sm">{similar.buyerName || 'Sin nombre'}</p>
                                                                {getStatusBadge(similar.status)}
                                                            </div>
                                                            <p className="text-xs text-slate-600 truncate">{similar.buyerEmail}</p>
                                                            <p className="text-xs font-mono font-semibold">Ref: {similar.paymentReference}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3 self-end sm:self-center">
                                                            <div className="text-right">
                                                                <p className="font-semibold">{formatCurrency(similar.amount, raffleCurrency)}</p>
                                                                <p className="text-xs text-slate-500">{format(new Date(similar.createdAt), "dd/MM/yy HH:mm", { locale: es })}</p>
                                                            </div>
                                                            <Button asChild variant="outline" size="sm">
                                                                <Link href={`/sale/${similar.id}`} target="_blank">
                                                                    Ver <ExternalLink className="h-3 w-3 ml-1.5" />
                                                                </Link>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                            </div>

                            <DialogFooter className="p-4 border-t flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-white">
                                {purchaseData.status === 'pending' ? (
                                    <>
                                        <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
                                            <DialogTrigger asChild><Button type="button" variant="destructive"><X className="h-4 w-4 mr-2" /> Rechazar</Button></DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Motivo del Rechazo</DialogTitle>
                                                    <DialogDescription>Selecciona un motivo. Se notificará al comprador.</DialogDescription>
                                                </DialogHeader>
                                                <form action={formAction} className="space-y-4">
                                                    <input type="hidden" name="purchaseId" value={purchaseData.id} /><input type="hidden" name="newStatus" value="rejected" />
                                                    <RadioGroup name="rejectionReason" required value={rejectionReason} onValueChange={(v: any) => setRejectionReason(v)}>
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="invalid_payment" id="r1" /><Label htmlFor="r1">Pago inválido o incompleto</Label></div>
                                                        <div className="flex items-center space-x-2"><RadioGroupItem value="malicious" id="r2" /><Label htmlFor="r2">Actividad sospechosa o fraudulenta</Label></div>
                                                    </RadioGroup>
                                                    {rejectionReason === 'malicious' && (<Textarea placeholder="Comentario obligatorio..." id="rejectionComment" name="rejectionComment" value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)} />)}
                                                    <DialogFooter>
                                                        <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                                                        <SubmitButton newStatus="rejected" disabled={isRejectButtonDisabled}>Rechazar y Notificar</SubmitButton>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild><Button type="button" className="w-full bg-orange-500 hover:bg-orange-600 text-white"><Check className="h-4 w-4 mr-2" /> Confirmar</Button></AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>¿Confirmar esta compra?</AlertDialogTitle>
                                                    <AlertDialogDescription>Se asignarán los tickets al comprador. Esta acción no se puede deshacer.</AlertDialogDescription>
                                                    {hasSimilarReferences && (
                                                        <Alert variant="destructive" className="mt-2">
                                                            <AlertTriangle className="h-4 w-4" />
                                                            <AlertTitle>¡Cuidado!</AlertTitle>
                                                            <AlertDescription>
                                                                Has sido advertido sobre posibles duplicados. Asegúrate de que esta compra es legítima antes de continuar.
                                                            </AlertDescription>
                                                        </Alert>
                                                    )}
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                    <form action={formAction} className="w-full sm:w-auto">
                                                        <input type="hidden" name="purchaseId" value={purchaseData.id} /><input type="hidden" name="newStatus" value="confirmed" />
                                                        <AlertDialogAction asChild><SubmitButton newStatus="confirmed">Sí, confirmar</SubmitButton></AlertDialogAction>
                                                    </form>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </>
                                ) : (
                                    <Button variant="outline" disabled className="w-full">Compra ya {purchaseData.status === 'confirmed' ? 'confirmada' : 'rechazada'}.</Button>
                                )}
                            </DialogFooter>
                        </>
                    ) : null}
                </TooltipProvider>
            </DialogContent>
        </Dialog>
    );
}