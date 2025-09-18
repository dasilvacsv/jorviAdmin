// app/admin/settings/page.tsx - Página de configuraciones del sistema
import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSystemSettings, getAllRafflesWithRates } from '@/lib/actions-sellers';
import SystemSettingsForm from '@/components/admin/SystemSettingsForm';
import RaffleExchangeRatesTable from '@/components/admin/RaffleExchangeRatesTable';
import { Settings, DollarSign, Percent } from 'lucide-react';

export const metadata = {
  title: 'Configuraciones del Sistema - Admin',
  description: 'Gestiona las configuraciones globales del sistema y tasas de cambio.',
};

async function SettingsContent() {
  const [settings, rafflesWithRates] = await Promise.all([
    getSystemSettings(),
    getAllRafflesWithRates(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configuraciones del Sistema</h1>
        <p className="text-gray-600">
          Gestiona las configuraciones globales y tasas de cambio por rifa.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuraciones Globales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuraciones Globales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SystemSettingsForm initialSettings={settings} />
          </CardContent>
        </Card>

        {/* Información Actual */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Configuración Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Comisión por Referido</h4>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-green-600">
                  ${settings.commission_rate || '0.50'}
                </span>
                <span className="text-gray-600">USD por cliente único</span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Tasa de Cambio por Defecto</h4>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="text-2xl font-bold text-blue-600">
                  {settings.default_exchange_rate || 'No establecida'}
                </span>
                {settings.default_exchange_rate && (
                  <span className="text-gray-600">Bs por USD</span>
                )}
              </div>
            </div>

            <div className="text-sm text-gray-500">
              <p>• La comisión se paga una sola vez por cada cliente único referido.</p>
              <p>• Las tasas específicas por rifa tienen prioridad sobre la tasa por defecto.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Tasas por Rifa */}
      <Card>
        <CardHeader>
          <CardTitle>Tasas de Cambio por Rifa</CardTitle>
        </CardHeader>
        <CardContent>
          <RaffleExchangeRatesTable raffles={rafflesWithRates} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6">
      <Suspense fallback={
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <SettingsContent />
      </Suspense>
    </div>
  );
}