"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateRaffleExchangeRateAction } from '@/lib/actions-sellers';
import { toast } from 'sonner';

// Componentes de UI
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

// Iconos
import { Edit, Loader2, DollarSign, Ticket } from 'lucide-react';


// --- Interfaces y Tipos ---
interface Raffle {
  id: string;
  name: string;
  status: string;
  currency: string;
  exchangeRate: number | null;
  createdAt: Date;
}
interface RaffleExchangeRatesTableProps {
  raffles: Raffle[];
}
interface FormState {
  success: boolean;
  message: string; // CORRECCIÓN: De 'string | null' a 'string'
}

// --- Componentes Reutilizables ---

// Insignia de estado con colores consistentes
function RaffleStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Activa</Badge>;
    case 'finished':
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Finalizada</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// Botón de envío con degradado naranja y estado de carga
function SubmitButton({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="text-white font-semibold bg-gradient-to-br from-orange-500 to-amber-500 hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500"
    >
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <DollarSign className="mr-2 h-4 w-4" />}
      {children}
    </Button>
  );
}

// --- Componente del Diálogo de Edición ---
function UpdateRateDialog({ raffle, children }: { raffle: Raffle; children: ReactNode }) {
  // CORRECCIÓN: 'message' ahora es una cadena vacía en el estado inicial
  const initialState: FormState = { success: false, message: '' };
  const [state, formAction] = useFormState(updateRaffleExchangeRateAction, initialState);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // La condición 'if (state.message)' funciona correctamente con ''
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        setOpen(false); // Cierra el diálogo solo en caso de éxito
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Actualizar Tasa de Cambio Específica</DialogTitle>
          <DialogDescription>
            Establece la tasa <span className="font-semibold">VES por USD</span> para la rifa: <strong className="text-foreground">{raffle.name}</strong>
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 pt-4">
          <input type="hidden" name="raffleId" value={raffle.id} />
          <div className="grid gap-2">
            <Label htmlFor="usdToVesRate">Tasa de cambio</Label>
            <Input
              id="usdToVesRate"
              name="usdToVesRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={raffle.exchangeRate?.toString() || ''}
              placeholder="Ej: 38.50"
            />
            <p className="text-xs text-muted-foreground">
              Deja el campo vacío para usar la tasa de cambio por defecto del sistema.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <SubmitButton>Actualizar Tasa</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Componente de Fila para la Tabla (Vista Desktop) ---
function RaffleTableRow({ raffle }: { raffle: Raffle }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-foreground">{raffle.name}</div>
        <div className="text-xs text-muted-foreground font-mono">ID: {raffle.id}</div>
      </TableCell>
      <TableCell><RaffleStatusBadge status={raffle.status} /></TableCell>
      <TableCell><Badge variant="secondary">{raffle.currency}</Badge></TableCell>
      <TableCell>
        {raffle.exchangeRate ? (
          <div className="font-semibold text-foreground font-mono">{raffle.exchangeRate} VES</div>
        ) : (
          <span className="text-muted-foreground italic text-sm">Usa tasa por defecto</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {new Date(raffle.createdAt).toLocaleDateString('es-VE')}
      </TableCell>
      <TableCell className="text-right">
        <UpdateRateDialog raffle={raffle}>
          <Button variant="outline" size="sm"><Edit className="h-3 w-3 mr-2" />Editar</Button>
        </UpdateRateDialog>
      </TableCell>
    </TableRow>
  );
}

// --- Componente de Tarjeta para la Lista (Vista Móvil) ---
function RaffleCard({ raffle }: { raffle: Raffle }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{raffle.name}</CardTitle>
                <div className="flex items-center gap-2 pt-2">
                    <RaffleStatusBadge status={raffle.status} />
                    <Badge variant="secondary">{raffle.currency}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Tasa Específica:</span>
                    {raffle.exchangeRate ? (
                        <span className="font-semibold text-foreground font-mono">{raffle.exchangeRate} VES</span>
                    ) : (
                        <span className="text-muted-foreground italic">Usa tasa por defecto</span>
                    )}
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Fecha Creación:</span>
                    <span className="text-foreground">{new Date(raffle.createdAt).toLocaleDateString('es-VE')}</span>
                </div>
                <UpdateRateDialog raffle={raffle}>
                    <Button variant="outline" size="sm" className="w-full"><Edit className="h-3 w-3 mr-2" />Editar Tasa</Button>
                </UpdateRateDialog>
            </CardContent>
        </Card>
    );
}


// --- Componente Principal ---
export default function RaffleExchangeRatesTable({ raffles }: RaffleExchangeRatesTableProps) {
  if (raffles.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <Ticket className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium text-foreground">No hay rifas para configurar</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Cuando crees una rifa, aparecerá aquí para que puedas asignarle una tasa de cambio específica.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Vista de Tabla para Desktop (oculta en móvil) */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rifa</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Moneda</TableHead>
              <TableHead>Tasa Específica (VES)</TableHead>
              <TableHead>Fecha Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {raffles.map((raffle) => <RaffleTableRow key={raffle.id} raffle={raffle} />)}
          </TableBody>
        </Table>
      </div>

      {/* Vista de Tarjetas para Móvil (oculta en desktop) */}
      <div className="md:hidden space-y-4">
        {raffles.map((raffle) => <RaffleCard key={raffle.id} raffle={raffle} />)}
      </div>
    </div>
  );
}