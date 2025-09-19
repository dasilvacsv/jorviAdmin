// app/admin/settings/page.tsx - Página de configuraciones del sistema
import { Suspense } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton'; // Importa el componente Skeleton
import { getSystemSettings, getAllRafflesWithRates } from '@/lib/actions-sellers';
import SystemSettingsForm from '@/components/admin/SystemSettingsForm';
import RaffleExchangeRatesTable from '@/components/admin/RaffleExchangeRatesTable';
import { Settings, DollarSign } from 'lucide-react';

export const metadata = {
  title: 'Configuraciones del Sistema - Admin',
  description: 'Gestiona las configuraciones globales del sistema y tasas de cambio.',
};

// --- Componente de Carga (Skeleton) ---
function SettingsSkeleton() {
  return (
    <div className="space-y-8">
      {/* Skeleton para el Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-3/5" />
        <Skeleton className="h-5 w-4/5" />
      </div>
      
      {/* Skeleton para la primera tarjeta */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-1/3 ml-auto" />
        </CardContent>
      </Card>

      {/* Skeleton para la tabla */}
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-1/3" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


// --- Componente Principal del Contenido ---
async function SettingsContent() {
  const [settings, rafflesWithRates] = await Promise.all([
    getSystemSettings(),
    getAllRafflesWithRates(),
  ]);

  return (
    // Se usa flex-col para un layout robusto y simple en todos los dispositivos
    <div className="space-y-8">
      {/* Header de la página, más prominente y claro */}
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-lg">
          <Settings className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Configuraciones del Sistema
          </h1>
          <p className="text-muted-foreground">
            Gestiona las configuraciones globales y tasas de cambio por rifa.
          </p>
        </div>
      </div>

      {/* Tarjeta de Configuraciones Globales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuraciones Globales
          </CardTitle>
          <CardDescription>
            Ajusta los valores principales que afectan a todo el sistema, como la comisión por referido y la tasa de cambio por defecto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SystemSettingsForm initialSettings={settings} />
        </CardContent>
      </Card>
      
      {/* Tarjeta con la Tabla de Tasas por Rifa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tasas de Cambio por Rifa
          </CardTitle>
          <CardDescription>
            Define tasas de cambio específicas para rifas individuales. Estas tienen prioridad y anulan la tasa de cambio por defecto cuando aplican.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RaffleExchangeRatesTable raffles={rafflesWithRates} />
        </CardContent>
      </Card>
    </div>
  );
}


// --- Componente de la Página ---
export default function SettingsPage() {
  return (
    // Padding aumentado y centrado opcional para pantallas grandes
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}