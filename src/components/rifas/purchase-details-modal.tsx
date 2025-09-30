"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
// --- IMPORTS DE TOOLTIP AÑADIDOS ---
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useFormStatus } from "react-dom";
import {
    Check, X, Eye, Receipt, User, Mail, Phone, Ticket, DollarSign,
    CreditCard, Hash, ImageIcon, ExternalLink, Loader2, Edit, Save,
    AlertTriangle // <-- Se mantiene para el ícono del tooltip
} from "lucide-react";
import Image from "next/image";
import { updatePurchaseStatusAction, updatePurchaseInfoAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useFormState } from "react-dom";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

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
    raffleCurrency?: 'USD' | 'VES';
    isDuplicate?: boolean;
    duplicateSaleId?: string;
    similarReferences?: Purchase[];
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

function EditableInfoDetail({
    icon,
    label,
    value,
    onSave,
    type = "text",
    editable = false
}: {
    icon: React.ElementType,
    label: string,
    value: React.ReactNode,
    onSave?: (newValue: string) => void,
    type?: "text" | "email" | "tel",
    editable?: boolean
}) {
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
                        <Input
                            type={type}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-8 text-sm max-w-[200px]"
                            autoFocus
                        />
                        <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0">
                            <Save className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0">
                            <X className="h-4 w-4 text-red-600" />
                        </Button>
                    </>
                ) : (
                    <>
                        <span className="font-semibold text-slate-800 break-all text-right">
                            {value || <span className="italic text-slate-400">N/A</span>}
                        </span>
                        {editable && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setIsEditing(true)}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
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

export function PurchaseDetailsModal({
    purchase,
    raffleCurrency = 'USD',
    isDuplicate = false,
    duplicateSaleId,
    similarReferences = []
}: PurchaseDetailsModalProps) {
    const [open, setOpen] = useState(false);
    const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState<'invalid_payment' | 'malicious' | ''>('');
    const [rejectionComment, setRejectionComment] = useState('');

    const [purchaseData, setPurchaseData] = useState(purchase);

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

    const handleEmailChange = async (newEmail: string) => {
        const formData = new FormData();
        formData.append('purchaseId', purchaseData.id);
        formData.append('buyerEmail', newEmail);
        const result = await updatePurchaseInfoAction({ success: false, message: '' }, formData);
        toast({
            title: result.success ? "Éxito" : "Error",
            description: result.message || (result.success ? "Email actualizado." : "No se pudo actualizar."),
            variant: result.success ? "default" : "destructive",
        });
        if (result.success) setPurchaseData(prev => ({ ...prev, buyerEmail: newEmail }));
    };

    const handlePhoneChange = async (newPhone: string) => {
        const formData = new FormData();
        formData.append('purchaseId', purchaseData.id);
        formData.append('buyerPhone', newPhone);
        const result = await updatePurchaseInfoAction({ success: false, message: '' }, formData);
        toast({
            title: result.success ? "Éxito" : "Error",
            description: result.message || (result.success ? "Teléfono actualizado." : "No se pudo actualizar."),
            variant: result.success ? "default" : "destructive",
        });
        if (result.success) setPurchaseData(prev => ({ ...prev, buyerPhone: newPhone }));
    };

    const formatCurrency = (amount: string, currency: 'USD' | 'VES') => {
        const value = parseFloat(amount).toFixed(2);
        return currency === 'USD' ? `$${value}` : `Bs. ${value}`;
    };

    const isRejectButtonDisabled = !rejectionReason || (rejectionReason === 'malicious' && rejectionComment.trim() === '');
    const hasSimilarReferences = similarReferences.length > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-2" />Ver Detalles</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md sm:max-w-2xl lg:max-w-6xl w-full p-0 max-h-[90vh] flex flex-col">
                <TooltipProvider>
                    <DialogHeader className="p-6 pb-4 border-b flex flex-row items-center justify-between">
                        <DialogTitle className="text-2xl flex items-center gap-3">
                            <Receipt className="h-6 w-6 text-orange-500" />
                            Detalles de la Compra
                        </DialogTitle>
                        <Button asChild variant="ghost" size="icon">
                            <Link href={`/sale/${purchase.id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-5 w-5" />
                            </Link>
                        </Button>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <Card className="shadow-none border border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <User className="h-5 w-5 text-orange-500" />
                                        Información del Comprador
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <CompactInfoDetail icon={User} label="Nombre" value={purchaseData.buyerName} />
                                    <EditableInfoDetail icon={Mail} label="Email" value={purchaseData.buyerEmail} type="email" onSave={handleEmailChange} editable={true} />
                                    <EditableInfoDetail icon={Phone} label="Teléfono" value={purchaseData.buyerPhone || ''} type="tel" onSave={handlePhoneChange} editable={true} />
                                </CardContent>
                            </Card>

                            <Card className="shadow-none border border-slate-200">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Receipt className="h-5 w-5 text-orange-500" />
                                        Detalles de la Transacción
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1">
                                    <CompactInfoDetail icon={Ticket} label="Tickets" value={purchaseData.ticketCount} />
                                    <CompactInfoDetail icon={DollarSign} label="Monto" value={formatCurrency(purchaseData.amount, raffleCurrency)} />
                                    <CompactInfoDetail icon={CreditCard} label="Método" value={purchaseData.paymentMethod} />

                                    {/* --- BLOQUE DE REFERENCIA MODIFICADO CON TOOLTIP --- */}
                                    <div className="flex items-center justify-between text-sm py-2">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Hash className="h-4 w-4" />
                                            <span>Referencia</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {hasSimilarReferences ? (
                                                <Tooltip delayDuration={100}>
                                                    <TooltipTrigger asChild>
                                                        <span className="font-semibold break-all text-right font-mono text-red-500 cursor-help">
                                                            {purchaseData.paymentReference || <span className="italic text-slate-400 font-sans">N/A</span>}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="border-red-300 bg-red-50 text-red-900 max-w-xs" side="top">
                                                        <div className="flex items-start gap-2 p-1">
                                                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                                            <p className="font-sans text-sm">
                                                                Se encontraron {similarReferences.length} compra(s) con referencias que terminan en los mismos 4 dígitos ({purchaseData.paymentReference?.slice(-4)}). Verifica si no son duplicados.
                                                            </p>
                                                        </div>
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <span className={`font-semibold break-all text-right font-mono ${isDuplicate ? 'text-red-500' : 'text-slate-800'}`}>
                                                    {purchaseData.paymentReference || <span className="italic text-slate-400 font-sans">N/A</span>}
                                                </span>
                                            )}

                                            {isDuplicate && duplicateSaleId && (
                                                <Button asChild variant="outline" size="sm" className="h-7 px-2">
                                                    <Link href={`/sale/${duplicateSaleId}`} target="_blank">
                                                        Ir a la venta
                                                        <ExternalLink className="h-3 w-3 ml-1.5" />
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                            <Card className="shadow-none border border-slate-200 order-first lg:order-last">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <ImageIcon className="h-5 w-5 text-orange-500" />
                                        Comprobante de Pago
                                    </CardTitle>
                                </CardHeader>
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
                                        <AlertDialogHeader><AlertDialogTitle>¿Confirmar esta compra?</AlertDialogTitle><AlertDialogDescription>Se asignarán los tickets al comprador. Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
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
                </TooltipProvider>
            </DialogContent>
        </Dialog>
    );
}