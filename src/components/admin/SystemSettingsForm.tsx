// components/admin/SystemSettingsForm.tsx
"use client";

import { useState, useEffect, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateSystemSettingAction } from '@/lib/actions-sellers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

// Interfaz para el estado de la acción del formulario
interface FormState {
  success: boolean;
  message: string;
}

// --- Componente de Botón Reutilizable con Estado de Carga y Estilo Degradado ---
function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="text-white font-semibold bg-gradient-to-br from-orange-500 to-amber-500 hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500"
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      {children}
    </Button>
  );
}

// --- Componente para un Campo de Configuración Individual ---
interface SettingFieldProps {
  settingKey: string;
  title: string;
  description: string;
  label: string;
  placeholder: string;
  inputType: string;
  initialValue: string;
  actionDescription: string;
  step?: string;
  min?: string;
}

function SettingField({
  settingKey,
  title,
  description,
  label,
  placeholder,
  inputType,
  initialValue,
  actionDescription,
  step,
  min
}: SettingFieldProps) {
  const initialState: FormState = { success: false, message: '' };
  const [state, formAction] = useFormState(updateSystemSettingAction, initialState);
  const [displayMessage, setDisplayMessage] = useState<string>('');
  
  useEffect(() => {
    if (state.message) {
      setDisplayMessage(state.message);
      if (state.success) {
        const timer = setTimeout(() => {
          setDisplayMessage('');
        }, 3000); // El mensaje de éxito desaparece después de 3 segundos
        return () => clearTimeout(timer);
      }
    }
  }, [state]);
  
  return (
    // Layout de Grid para alinear contenido: 1 columna en móvil, 3 en desktop
    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
      <div className="md:col-span-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="md:col-span-2">
        <form action={formAction} className="space-y-4">
          {displayMessage && (
            <Alert variant={state.success ? "default" : "destructive"} className={state.success ? 'bg-green-50 border-green-200' : ''}>
              {state.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription className="font-medium">
                {displayMessage}
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label htmlFor={settingKey}>{label}</Label>
            <Input
              id={settingKey}
              name="value"
              type={inputType}
              step={step}
              min={min}
              defaultValue={initialValue}
              placeholder={placeholder}
              className="mt-1"
            />
          </div>
          
          {/* Campos ocultos para la Server Action */}
          <input type="hidden" name="key" value={settingKey} />
          <input type="hidden" name="description" value={actionDescription} />
          
          <div className="flex justify-end">
            <SubmitButton>Guardar Cambios</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}


// --- Componente Principal del Formulario ---
interface SystemSettingsFormProps {
  initialSettings: Record<string, string>;
}

export default function SystemSettingsForm({ initialSettings }: SystemSettingsFormProps) {
  return (
    <div className="space-y-8">
      <SettingField
        settingKey="commission_rate"
        title="Comisión de Referidos"
        description="Monto en USD que se paga una vez por cada cliente único que realice una compra confirmada a través de un enlace de referido."
        label="Comisión por Cliente Único (USD)"
        placeholder="0.50"
        inputType="number"
        initialValue={initialSettings.commission_rate || '0.50'}
        actionDescription="Comisión en USD que se paga por cada cliente único referido"
        step="0.01"
        min="0"
      />

      <Separator />

      <SettingField
        settingKey="default_exchange_rate"
        title="Tasa de Cambio por Defecto"
        description="Valor de 1 USD en Bolívares (VES). Esta tasa se aplica a todas las transacciones a menos que una rifa específica tenga su propia tasa definida."
        label="Tasa de cambio (VES por USD)"
        placeholder="36.50"
        inputType="number"
        initialValue={initialSettings.default_exchange_rate || ''}
        actionDescription="Tasa de cambio por defecto USD a VES"
        step="0.01"
        min="0"
      />
    </div>
  );
}