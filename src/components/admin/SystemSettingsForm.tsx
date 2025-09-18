// components/admin/SystemSettingsForm.tsx
"use client";

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { updateSystemSettingAction } from '@/lib/actions-sellers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SystemSettingsFormProps {
  initialSettings: Record<string, string>;
}

export default function SystemSettingsForm({ initialSettings }: SystemSettingsFormProps) {
  const [commissionState, commissionAction] = useFormState(updateSystemSettingAction, { success: false, message: '' });
  const [exchangeState, exchangeAction] = useFormState(updateSystemSettingAction, { success: false, message: '' });
  const [isPendingCommission, setIsPendingCommission] = useState(false);
  const [isPendingExchange, setIsPendingExchange] = useState(false);

  const handleCommissionSubmit = async (formData: FormData) => {
    setIsPendingCommission(true);
    formData.set('key', 'commission_rate');
    formData.set('description', 'Comisión en USD que se paga por cada cliente único referido');
    await commissionAction(formData);
    setIsPendingCommission(false);
  };

  const handleExchangeSubmit = async (formData: FormData) => {
    setIsPendingExchange(true);
    formData.set('key', 'default_exchange_rate');
    formData.set('description', 'Tasa de cambio por defecto USD a VES (usada cuando no hay tasa específica por rifa)');
    await exchangeAction(formData);
    setIsPendingExchange(false);
  };

  return (
    <div className="space-y-6">
      {/* Comisión de Referidos */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Comisión de Referidos</h3>
        <form action={handleCommissionSubmit} className="space-y-4">
          {commissionState.message && (
            <Alert variant={commissionState.success ? "default" : "destructive"}>
              <AlertDescription>{commissionState.message}</AlertDescription>
            </Alert>
          )}
          
          <div>
            <Label htmlFor="commission">Comisión por Cliente Único (USD)</Label>
            <Input
              id="commission"
              name="value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialSettings.commission_rate || '0.50'}
              placeholder="0.50"
              disabled={isPendingCommission}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Monto en USD que se paga por cada cliente único que realice una compra confirmada.
            </p>
          </div>

          <Button type="submit" disabled={isPendingCommission}>
            {isPendingCommission ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Comisión
          </Button>
        </form>
      </div>

      <Separator />

      {/* Tasa de Cambio por Defecto */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Tasa de Cambio por Defecto</h3>
        <form action={handleExchangeSubmit} className="space-y-4">
          {exchangeState.message && (
            <Alert variant={exchangeState.success ? "default" : "destructive"}>
              <AlertDescription>{exchangeState.message}</AlertDescription>
            </Alert>
          )}
          
          <div>
            <Label htmlFor="exchange">Tasa USD a VES</Label>
            <Input
              id="exchange"
              name="value"
              type="number"
              step="0.01"
              min="0"
              defaultValue={initialSettings.default_exchange_rate || ''}
              placeholder="36.50"
              disabled={isPendingExchange}
              className="mt-1"
            />
            <p className="text-sm text-gray-500 mt-1">
              Cuántos bolívares equivalen a 1 USD. Se usa cuando no hay tasa específica para una rifa.
            </p>
          </div>

          <Button type="submit" disabled={isPendingExchange}>
            {isPendingExchange ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Tasa por Defecto
          </Button>
        </form>
      </div>
    </div>
  );
}