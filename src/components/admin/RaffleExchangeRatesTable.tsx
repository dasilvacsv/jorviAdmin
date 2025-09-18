// components/admin/RaffleExchangeRatesTable.tsx
"use client";

import { useState } from 'react';
import { useFormState } from 'react-dom';
import { updateRaffleExchangeRateAction } from '@/lib/actions-sellers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Edit, Loader2, DollarSign } from 'lucide-react';

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

function UpdateRateDialog({ raffle }: { raffle: Raffle }) {
  const [state, formAction] = useFormState(updateRaffleExchangeRateAction, { success: false, message: '' });
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    formData.set('raffleId', raffle.id);
    await formAction(formData);
    setIsPending(false);
    
    if (state.success) {
      setOpen(false);
    }
  };

  const getRaffleStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case 'finished':
        return <Badge className="bg-blue-100 text-blue-800">Finalizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-1" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Actualizar Tasa de Cambio</DialogTitle>
          <DialogDescription>
            Configura la tasa USD a VES específica para: <strong>{raffle.name}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form action={handleSubmit} className="space-y-4">
          {state.message && (
            <Alert variant={state.success ? "default" : "destructive"}>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Tasa USD a VES</label>
            <Input
              name="usdToVesRate"
              type="number"
              step="0.01"
              min="0"
              defaultValue={raffle.exchangeRate?.toString() || ''}
              placeholder="36.50"
              disabled={isPending}
            />
            <p className="text-xs text-gray-500">
              Cuántos bolívares equivalen a 1 USD para esta rifa específica.
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="mr-2 h-4 w-4" />
              )}
              Actualizar Tasa
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RaffleExchangeRatesTable({ raffles }: RaffleExchangeRatesTableProps) {
  const getRaffleStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activa</Badge>;
      case 'finished':
        return <Badge className="bg-blue-100 text-blue-800">Finalizada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (raffles.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No hay rifas activas o finalizadas para configurar tasas de cambio.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rifa</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Moneda</TableHead>
            <TableHead>Tasa USD → VES</TableHead>
            <TableHead>Fecha Creación</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {raffles.map((raffle) => (
            <TableRow key={raffle.id}>
              <TableCell>
                <div>
                  <div className="font-medium">{raffle.name}</div>
                  <div className="text-sm text-gray-500 truncate max-w-xs">
                    ID: {raffle.id}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {getRaffleStatusBadge(raffle.status)}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {raffle.currency}
                </Badge>
              </TableCell>
              <TableCell>
                {raffle.exchangeRate ? (
                  <span className="font-mono text-sm">
                    1 USD = {raffle.exchangeRate} Bs
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Sin configurar</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(raffle.createdAt).toLocaleDateString('es-VE')}
              </TableCell>
              <TableCell className="text-right">
                <UpdateRateDialog raffle={raffle} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}