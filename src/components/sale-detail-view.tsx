// components/sale/SaleDetailView.tsx
"use client";

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { updatePurchaseStatusAction, updatePurchaseInfoAction } from '@/lib/actions'; // <--- ACCIÓN AÑADIDA
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

// Icons
import { ArrowLeft, User, Mail, Phone, CreditCard, Calendar, Ticket, ExternalLink, AlertTriangle, Eye, FileText, Copy, Check, X, Loader2, Edit, Save } from 'lucide-react'; // <--- ICONOS AÑADIDOS

// Types
import { SaleDetailData } from '@/lib/actions';

interface SaleDetailViewProps {
  saleData: SaleDetailData;
}


// --- COMPONENTES AUXILIARES AÑADIDOS ---

function EditableInfoDetail({ icon, label, value, onSave, type = "text", editable = false }: { icon: React.ElementType, label: string, value: React.ReactNode, onSave?: (newValue: string) => void, type?: string, editable?: boolean }) {
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
        <div className="flex items-center justify-between text-sm py-2 border-b last:border-b-0 group">
            <div className="flex items-center gap-2 text-gray-600">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
                {isEditing ? (
                    <>
                        <Input type={type} value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8 text-sm max-w-[220px]" autoFocus />
                        <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 w-8 p-0"><Save className="h-4 w-4 text-green-600" /></Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 w-8 p-0"><X className="h-4 w-4 text-red-600" /></Button>
                    </>
                ) : (
                    <>
                        <span className="font-semibold text-gray-800 break-all text-right">{value || <span className="italic text-gray-400">N/A</span>}</span>
                        {editable && (
                            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"><Edit className="h-4 w-4" /></Button>
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
        <div className="flex items-center justify-between text-sm py-2 border-b last:border-b-0">
            <div className="flex items-center gap-2 text-gray-600">
                <Icon className="h-4 w-4" />
                <span>{label}</span>
            </div>
            <span className="font-semibold text-gray-800 break-all text-right">{value || <span className="italic text-gray-400">N/A</span>}</span>
        </div>
    );
}


function SubmitButton({ children, newStatus, disabled }: { children: React.ReactNode; newStatus: "confirmed" | "rejected", disabled?: boolean }) {
    const { pending } = useFormStatus();
    const isConfirm = newStatus === 'confirmed';
    return (
        <Button type="submit" disabled={pending || disabled} className={`w-full sm:w-auto ${isConfirm ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`} variant={isConfirm ? 'default' : 'destructive'}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isConfirm ? <Check className="mr-2 h-4 w-4" /> : <X className="mr-2 h-4 w-4" />)}
            {children}
        </Button>
    );
}


export function SaleDetailView({ saleData }: SaleDetailViewProps) {
  const { purchase, similarReferences } = saleData;
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<'invalid_payment' | 'malicious' | ''>('');
  const [rejectionComment, setRejectionComment] = useState('');
  
  const [state, formAction] = useFormState(updatePurchaseStatusAction, { success: false, message: "" });

  useEffect(() => {
    if (state.message) {
      toast({
          title: state.success ? "Éxito" : "Error",
          description: state.message,
          variant: state.success ? "default" : "destructive",
      });
      if (state.success) {
          setRejectionDialogOpen(false);
          router.refresh();
      }
    }
  }, [state, toast, router]);

  const isRejectButtonDisabled = !rejectionReason || (rejectionReason === 'malicious' && rejectionComment.trim() === '');
  
  // --- LÓGICA PARA EDITAR INFO ---
  const handleInfoUpdate = async (formData: FormData) => {
      const result = await updatePurchaseInfoAction({ success: false, message: '' }, formData);
      toast({
          title: result.success ? "Éxito" : "Error",
          description: result.message || (result.success ? "Información actualizada." : "No se pudo actualizar."),
          variant: result.success ? "default" : "destructive",
      });
      if (result.success) {
          router.refresh();
      }
  };

  const handleEmailSave = (newEmail: string) => {
      const formData = new FormData();
      formData.append('purchaseId', purchase.id);
      formData.append('buyerEmail', newEmail);
      handleInfoUpdate(formData);
  };

  const handlePhoneSave = (newPhone: string) => {
      const formData = new FormData();
      formData.append('purchaseId', purchase.id);
      formData.append('buyerPhone', newPhone);
      handleInfoUpdate(formData);
  };

  // Helper functions
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

  const formatCurrency = (amount: string, currency: 'USD' | 'VES') => {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  const copyToClipboard = async (text: string, ref: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedRef(ref);
      setTimeout(() => setCopiedRef(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const rejectionReasonMap = {
    invalid_payment: "Pago Inválido o no Encontrado",
    malicious: "Actividad Sospechosa"
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> 
            Volver al Dashboard
          </Link>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Detalle de Venta #{purchase.id.slice(0, 8)}
              </h1>
              <p className="text-gray-600 mt-1">
                Información completa de la transacción
              </p>
            </div>
            {getStatusBadge(purchase.status)}
          </div>
        </div>

        {/* Similar References Alert */}
        {similarReferences.length > 0 && (
          <Alert variant="default" className="mb-6 bg-yellow-50 border-yellow-300">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="text-yellow-800 font-bold">
              Referencias Similares Detectadas
            </AlertTitle>
            <AlertDescription className="text-yellow-700">
              Se encontraron {similarReferences.length} compra(s) con referencias que terminan en los mismos 4 dígitos ({purchase.paymentReference?.slice(-4)}). Verifica si no son duplicados.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* --- TARJETA DE INFORMACIÓN DEL COMPRADOR MODIFICADA --- */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información del Comprador
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 px-6 pb-4">
                <CompactInfoDetail icon={User} label="Nombre" value={purchase.buyerName} />
                <EditableInfoDetail
                    icon={Mail}
                    label="Email"
                    value={purchase.buyerEmail}
                    onSave={handleEmailSave}
                    editable={true}
                    type="email"
                />
                <EditableInfoDetail
                    icon={Phone}
                    label="Teléfono"
                    value={purchase.buyerPhone || ''}
                    onSave={handlePhoneSave}
                    editable={true}
                    type="tel"
                />
                <CompactInfoDetail icon={Calendar} label="Fecha de Compra" value={format(new Date(purchase.createdAt), "PPPp", { locale: es })} />

                {purchase.referralLink && (
                    <div className="pt-2">
                         <CompactInfoDetail icon={ExternalLink} label="Origen de la Venta" value={`${purchase.referralLink.name} (${purchase.referralLink.code})`} />
                    </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Información de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Método de Pago</label>
                    <p className="font-semibold">{purchase.paymentMethod || 'No especificado'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Referencia</label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-semibold text-lg">
                        {purchase.paymentReference || 'No especificada'}
                      </p>
                      {purchase.paymentReference && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(purchase.paymentReference!, 'main')}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      {copiedRef === 'main' && (
                        <span className="text-xs text-green-600">¡Copiado!</span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Monto</label>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(purchase.amount, purchase.raffle.currency)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-600">Cantidad de Tickets</label>
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-gray-400" />
                      <p className="font-semibold">{purchase.ticketCount}</p>
                    </div>
                  </div>
                </div>

                {/* Payment Screenshot */}
                {purchase.paymentScreenshotUrl && (
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-600 block mb-2">
                      Comprobante de Pago
                    </label>
                    <div className="relative inline-block">
                      <Image
                        src={purchase.paymentScreenshotUrl}
                        alt="Comprobante de pago"
                        width={300}
                        height={200}
                        className="rounded-lg border object-cover"
                      />
                      <Button
                        asChild
                        variant="secondary"
                        size="sm"
                        className="absolute top-2 right-2"
                      >
                        <a
                          href={purchase.paymentScreenshotUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rejection Information */}
            {purchase.status === 'rejected' && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    Información del Rechazo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-red-600">Motivo</label>
                    <p className="font-semibold text-red-800">
                      {purchase.rejectionReason 
                        ? rejectionReasonMap[purchase.rejectionReason as keyof typeof rejectionReasonMap]
                        : 'No especificado'
                      }
                    </p>
                  </div>
                  {purchase.rejectionComment && (
                    <div>
                      <label className="text-sm font-medium text-red-600">Comentario</label>
                      <p className="text-red-800">{purchase.rejectionComment}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Similar References List */}
            {similarReferences.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-700">
                    <AlertTriangle className="h-5 w-5" />
                    Referencias Similares ({similarReferences.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {similarReferences.map((similar) => (
                      <div key={similar.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-sm">
                                {similar.buyerName || 'Sin nombre'}
                              </p>
                              {getStatusBadge(similar.status)}
                            </div>
                            <p className="text-sm text-gray-600">{similar.buyerEmail}</p>
                            <p className="text-sm text-gray-500">
                              Rifa: {similar.raffle.name}
                            </p>
                            <div className="flex items-center gap-4">
                              <p className="text-sm font-mono font-semibold">
                                Ref: {similar.paymentReference}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(similar.paymentReference || '', similar.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              {copiedRef === similar.id && (
                                <span className="text-xs text-green-600">¡Copiado!</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="font-semibold">
                                {formatCurrency(similar.amount, purchase.raffle.currency)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(similar.createdAt), "dd/MM/yy", { locale: es })}
                              </p>
                            </div>
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/sale/${similar.id}`} target="_blank">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Raffle Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Información de la Rifa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Rifa</label>
                    <p className="font-semibold">{purchase.raffle.name}</p>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Estado:</span>
                    {getStatusBadge(purchase.status)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tickets:</span>
                    <span className="font-semibold">{purchase.ticketCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Monto:</span>
                    <span className="font-semibold">
                      {formatCurrency(purchase.amount, purchase.raffle.currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

           

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {purchase.status === 'pending' ? (
                  <div className="space-y-2">
                    {/* Botón y Modal de Rechazo */}
                    <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" className="w-full"><X className="h-4 w-4 mr-2" /> Rechazar Compra</Button>
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
                              <RadioGroupItem value="invalid_payment" id="r1_page" />
                              <Label htmlFor="r1_page">Pago inválido o incompleto</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="malicious" id="r2_page" />
                              <Label htmlFor="r2_page">Actividad sospechosa o fraudulenta</Label>
                            </div>
                          </RadioGroup>
                          {rejectionReason === 'malicious' && (
                            <Textarea placeholder="Comentario obligatorio..." name="rejectionComment" value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)} />
                          )}
                          <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                            <SubmitButton newStatus="rejected" disabled={isRejectButtonDisabled}>Rechazar y Notificar</SubmitButton>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {/* Botón y Modal de Confirmación */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                          <Check className="h-4 w-4 mr-2" /> Confirmar Compra
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Confirmar esta compra?</AlertDialogTitle>
                          <AlertDialogDescription>Se asignarán los tickets al comprador y se le notificará. Esta acción no se puede deshacer.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <form action={formAction}>
                            <input type="hidden" name="purchaseId" value={purchase.id} />
                            <input type="hidden" name="newStatus" value="confirmed" />
                            <AlertDialogAction asChild>
                              <SubmitButton newStatus="confirmed">Sí, confirmar</SubmitButton>
                            </AlertDialogAction>
                          </form>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 p-4 text-center bg-gray-100 rounded-md">
                    Esta compra ya ha sido {purchase.status === 'confirmed' ? 'confirmada' : 'rechazada'}.
                  </p>
                )}
                
                <Separator />
                
                <Button asChild variant="outline" className="w-full">
                    <Link href={`/dashboard/rifas/${purchase.raffle.id}`}>
                        <FileText className="h-4 w-4 mr-2" />
                        Ir a la Rifa
                    </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}