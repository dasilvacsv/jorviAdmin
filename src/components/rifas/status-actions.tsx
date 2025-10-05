"use client";

import { updateRaffleStatusAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
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
import { Play, Square, XCircle, Pause, Trophy } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface StatusActionsProps {
  raffle: {
    id: string;
    status: string;
  };
}

// Componente para el botón de envío que muestra un estado de carga
function SubmitButton({ children, variant, className }: { children: React.ReactNode, variant?: any, className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending} variant={variant} className={className}>
      {pending ? "Procesando..." : children}
    </Button>
  );
}

export function StatusActions({ raffle }: StatusActionsProps) {
  const [state, formAction] = useFormState(updateRaffleStatusAction, { success: false, message: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? "Éxito" : "Error",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      });
    }
  }, [state, toast]);

  if (raffle.status === 'draft') {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <Play className="h-4 w-4 mr-1" /> Activar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Activar esta rifa?</AlertDialogTitle>
            <AlertDialogDescription>
              La rifa será visible públicamente y se podrán comprar tickets. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <form action={formAction}>
              <input type="hidden" name="raffleId" value={raffle.id} />
              <input type="hidden" name="status" value="active" />
              <AlertDialogAction asChild>
                <SubmitButton>Sí, activar</SubmitButton>
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (raffle.status === 'active') {
    return (
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
              <Pause className="h-4 w-4 mr-1" /> Pausar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Pausar la rifa?</AlertDialogTitle>
              <AlertDialogDescription>
                Se pausará la venta de tickets. Los participantes verán un mensaje de espera de resultados.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={formAction}>
                <input type="hidden" name="raffleId" value={raffle.id} />
                <input type="hidden" name="status" value="postponed" />
                <AlertDialogAction asChild>
                  <SubmitButton className="bg-orange-600 hover:bg-orange-700">Sí, pausar</SubmitButton>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Square className="h-4 w-4 mr-1" /> Finalizar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Finalizar la rifa?</AlertDialogTitle>
              <AlertDialogDescription>
                Se detendrá la venta de tickets. Asegúrate de que el sorteo se haya realizado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={formAction}>
                <input type="hidden" name="raffleId" value={raffle.id} />
                <input type="hidden" name="status" value="finished" />
                <AlertDialogAction asChild>
                  <SubmitButton>Sí, finalizar</SubmitButton>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <XCircle className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cancelar esta rifa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible y detendrá la venta de tickets.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, mantener</AlertDialogCancel>
              <form action={formAction}>
                <input type="hidden" name="raffleId" value={raffle.id} />
                <input type="hidden" name="status" value="cancelled" />
                <AlertDialogAction asChild>
                  <SubmitButton variant="destructive">Sí, cancelar</SubmitButton>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (raffle.status === 'postponed') {
    return (
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">
              <Play className="h-4 w-4 mr-1" /> Reanudar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Reanudar la rifa?</AlertDialogTitle>
              <AlertDialogDescription>
                Se reanudará la venta de tickets y los participantes podrán seguir comprando.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={formAction}>
                <input type="hidden" name="raffleId" value={raffle.id} />
                <input type="hidden" name="status" value="active" />
                <AlertDialogAction asChild>
                  <SubmitButton>Sí, reanudar</SubmitButton>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              <Trophy className="h-4 w-4 mr-1" /> Anunciar Ganador
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Finalizar y proceder al sorteo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se finalizará la rifa y podrás registrar el ganador. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <form action={formAction}>
                <input type="hidden" name="raffleId" value={raffle.id} />
                <input type="hidden" name="status" value="finished" />
                <AlertDialogAction asChild>
                  <SubmitButton>Sí, finalizar</SubmitButton>
                </AlertDialogAction>
              </form>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}