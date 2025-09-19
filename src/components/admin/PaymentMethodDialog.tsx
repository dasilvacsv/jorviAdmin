"use client";

import { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Loader2,
  AlertCircle,
  Upload,
  X,
  Banknote,
  Smartphone,
  Bitcoin,
  Wallet,
} from "lucide-react";
import Image from "next/image";

// --- SHADCN/UI & CUSTOM COMPONENTS ---
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// --- TYPES & CONSTANTS ---
interface PaymentMethod {
  id?: string;
  title?: string;
  iconUrl?: string | null;
  isActive?: boolean;
  triggersApiVerification?: boolean;
  accountHolderName?: string | null;
  rif?: string | null;
  phoneNumber?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  binancePayId?: string | null;
}

interface PaymentMethodDialogProps {
  action: (
    prevState: any,
    formData: FormData
  ) => Promise<{ success: boolean; message: string }>;
  method?: PaymentMethod;
  triggerButton: React.ReactNode;
}

const initialState: Omit<PaymentMethod, "id"> = {
  title: "",
  iconUrl: null,
  isActive: true,
  triggersApiVerification: false,
  accountHolderName: "",
  rif: "",
  phoneNumber: "",
  bankName: "",
  accountNumber: "",
  email: "",
  walletAddress: "",
  network: "",
  binancePayId: "",
};

type MethodType = "bank" | "mobile" | "crypto" | "ewallet";

const methodTypes = [
  { value: "bank", label: "Transferencia Bancaria", icon: Banknote },
  { value: "mobile", label: "Pago Móvil", icon: Smartphone },
  { value: "crypto", label: "Criptomoneda (Binance)", icon: Bitcoin },
  { value: "ewallet", label: "E-Wallet (Zinli)", icon: Wallet },
];

// --- SUB-COMPONENTES PARA MAYOR CLARIDAD ---

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  const primaryButtonClasses =
    "font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-lg hover:shadow-orange-500/40 transition-all";
  return (
    <Button type="submit" disabled={pending} className={primaryButtonClasses}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditing ? "Guardar Cambios" : "Crear Método"}
    </Button>
  );
}

// Componentes para cada grupo de campos
const BankFields = ({ data, onChange }: any) => (
  <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="accountHolderName">Nombre del Titular</Label>
      <Input
        id="accountHolderName"
        name="accountHolderName"
        value={data.accountHolderName ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="rif">Cédula / RIF</Label>
      <Input
        id="rif"
        name="rif"
        placeholder="V-12345678"
        value={data.rif ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="bankName">Nombre del Banco</Label>
      <Input
        id="bankName"
        name="bankName"
        placeholder="Banesco"
        value={data.bankName ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="accountNumber">Número de Cuenta</Label>
      <Input
        id="accountNumber"
        name="accountNumber"
        placeholder="0134..."
        value={data.accountNumber ?? ""}
        onChange={onChange}
      />
    </div>
  </div>
);

const MobilePaymentFields = ({ data, onChange }: any) => (
  <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="accountHolderName">Nombre del Titular</Label>
      <Input
        id="accountHolderName"
        name="accountHolderName"
        value={data.accountHolderName ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="rif">Cédula / RIF</Label>
      <Input
        id="rif"
        name="rif"
        placeholder="V-12345678"
        value={data.rif ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="bankName">Nombre del Banco</Label>
      <Input
        id="bankName"
        name="bankName"
        placeholder="Banesco"
        value={data.bankName ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="phoneNumber">Teléfono</Label>
      <Input
        id="phoneNumber"
        name="phoneNumber"
        placeholder="0412-1234567"
        value={data.phoneNumber ?? ""}
        onChange={onChange}
      />
    </div>
  </div>
);

const CryptoFields = ({ data, onChange }: any) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="binancePayId">Binance Pay ID</Label>
      <Input
        id="binancePayId"
        name="binancePayId"
        placeholder="Ej: 123456789"
        value={data.binancePayId ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="walletAddress">Dirección de Wallet (Opcional)</Label>
      <Input
        id="walletAddress"
        name="walletAddress"
        placeholder="Txxxxxxxx..."
        value={data.walletAddress ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="network">Red (Opcional)</Label>
      <Input
        id="network"
        name="network"
        placeholder="Ej: TRC20, BEP20"
        value={data.network ?? ""}
        onChange={onChange}
      />
    </div>
  </div>
);

const EWalletFields = ({ data, onChange }: any) => (
  <div className="grid sm:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label htmlFor="email">Correo Electrónico</Label>
      <Input
        id="email"
        name="email"
        placeholder="tu_correo@example.com"
        value={data.email ?? ""}
        onChange={onChange}
      />
    </div>
    <div className="space-y-2">
      <Label htmlFor="phoneNumber">Teléfono (Opcional)</Label>
      <Input
        id="phoneNumber"
        name="phoneNumber"
        placeholder="0412-1234567"
        value={data.phoneNumber ?? ""}
        onChange={onChange}
      />
    </div>
  </div>
);

// --- COMPONENTE PRINCIPAL ---
export function PaymentMethodDialog({
  action,
  method,
  triggerButton,
}: PaymentMethodDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, {
    success: false,
    message: "",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = !!method;

  const [formData, setFormData] =
    useState<Omit<PaymentMethod, "id">>(initialState);
  const [methodType, setMethodType] = useState<MethodType>("bank");
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Efecto para inicializar el formulario en modo edición o resetearlo
  useEffect(() => {
    if (open) {
      if (isEditing && method) {
        // Lógica para determinar el tipo de método al editar
        let type: MethodType = "bank";
        if (method.binancePayId || method.walletAddress) type = "crypto";
        else if (method.email && !method.bankName) type = "ewallet";
        else if (method.phoneNumber && !method.accountNumber) type = "mobile";

        setMethodType(type);
        setFormData({
          title: method.title ?? "",
          iconUrl: method.iconUrl ?? null,
          isActive: method.isActive ?? true,
          triggersApiVerification: method.triggersApiVerification ?? false,
          accountHolderName: method.accountHolderName ?? "",
          rif: method.rif ?? "",
          phoneNumber: method.phoneNumber ?? "",
          bankName: method.bankName ?? "",
          accountNumber: method.accountNumber ?? "",
          email: method.email ?? "",
          walletAddress: method.walletAddress ?? "",
          network: method.network ?? "",
          binancePayId: method.binancePayId ?? "",
        });
        setIconPreview(method.iconUrl ?? null);
      } else {
        setMethodType("bank");
        setFormData(initialState);
        setIconPreview(null);
        setIconFile(null);
      }
    }
  }, [method, isEditing, open]);

  // Cerrar el diálogo en caso de éxito
  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  const handleSwitchChange = (name: keyof PaymentMethod, checked: boolean) =>
    setFormData((prev) => ({ ...prev, [name]: checked }));

  const handleFileChange = (file: File | null) => {
    setIconFile(file);
    if (file) setIconPreview(URL.createObjectURL(file));
    else setIconPreview(method?.iconUrl ?? null);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files?.[0] || null);
  };
  const handleDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Método de Pago" : "Nuevo Método de Pago"}
          </DialogTitle>
          <DialogDescription>
            Completa la información del método. Los campos con (*) son
            obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-6 pt-2">
          {state.message && !state.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {method?.id && <input type="hidden" name="id" value={method.id} />}
          {Object.entries(formData).map(
            ([key, value]) =>
              typeof value === "boolean" && (
                <input
                  key={key}
                  type="hidden"
                  name={key}
                  value={String(value)}
                />
              )
          )}
          {/* La carga real del archivo se debe manejar en la server action */}
          <input type="file" name="icon" className="hidden" />

          {/* --- SECCIÓN GENERAL --- */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título del Método <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Ej: Pago Móvil Banesco"
                required
                value={formData.title ?? ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="icon-upload">Ícono del Método</Label>
              <label
                htmlFor="icon-upload"
                className={`relative mt-2 flex justify-center w-full h-32 px-6 pt-5 pb-6 border-2 border-dashed rounded-md cursor-pointer transition-colors ${
                  isDragging ? "border-primary bg-primary/10" : "border-border"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <div className="space-y-1 text-center">
                  {iconPreview ? (
                    <>
                      <Image
                        src={iconPreview}
                        alt="Vista previa"
                        layout="fill"
                        className="rounded-md object-contain p-2"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={(e) => {
                          e.preventDefault();
                          handleFileChange(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arrastra una imagen o haz clic para subirla
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PNG, JPG, SVG hasta 1MB
                      </p>
                    </>
                  )}
                </div>
                <Input
                  id="icon-upload"
                  name="icon"
                  type="file"
                  className="sr-only"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] || null)
                  }
                  accept="image/*"
                />
              </label>
            </div>
          </div>

          <Separator />

          {/* --- SECCIÓN DE DETALLES (AHORA DINÁMICA) --- */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Método</Label>
              <Select
                value={methodType}
                onValueChange={(value) => setMethodType(value as MethodType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo..." />
                </SelectTrigger>
                <SelectContent>
                  {methodTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" /> {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {methodType === "bank" && (
              <BankFields data={formData} onChange={handleChange} />
            )}
            {methodType === "mobile" && (
              <MobilePaymentFields data={formData} onChange={handleChange} />
            )}
            {methodType === "crypto" && (
              <CryptoFields data={formData} onChange={handleChange} />
            )}
            {methodType === "ewallet" && (
              <EWalletFields data={formData} onChange={handleChange} />
            )}
          </div>

          <Separator />

          {/* --- SECCIÓN DE CONFIGURACIÓN --- */}
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isActive-switch">Activo para clientes</Label>
                <p className="text-xs text-muted-foreground">
                  Si está activo, los clientes podrán seleccionarlo.
                </p>
              </div>
              <Switch
                id="isActive-switch"
                checked={formData.isActive}
                onCheckedChange={(c) => handleSwitchChange("isActive", c)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="triggersApiVerification-switch">
                  Verificación Automática
                </Label>
                <p className="text-xs text-muted-foreground">
                  Intenta confirmar pagos con este método vía API.
                </p>
              </div>
              <Switch
                id="triggersApiVerification-switch"
                checked={formData.triggersApiVerification}
                onCheckedChange={(c) =>
                  handleSwitchChange("triggersApiVerification", c)
                }
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton isEditing={isEditing} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}