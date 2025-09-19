"use client";

import { updateRaffleStatusAction } from "@/lib/actions";
import { Button, ButtonProps } from "@/components/ui/button";
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
import { Play, Square, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

// Componente SubmitButton sin cambios
interface SubmitButtonProps extends ButtonProps {
    children: React.ReactNode;
}

function SubmitButton({ children, ...props }: SubmitButtonProps) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" disabled={pending} {...props}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {pending ? "Procesando..." : children}
        </Button>
    );
}

// Componente ActionConfirmationDialog sin cambios
interface ActionConfirmationDialogProps {
    raffleId: string;
    newStatus: 'active' | 'finished' | 'cancelled';
    triggerButton: React.ReactNode;
    icon: React.ReactNode;
    title: string;
    description: string;
    confirmText: string;
    confirmButtonVariant?: ButtonProps['variant'];
}

function ActionConfirmationDialog({
    raffleId,
    newStatus,
    triggerButton,
    icon,
    title,
    description,
    confirmText,
    confirmButtonVariant = "default",
}: ActionConfirmationDialogProps) {
    const [state, formAction] = useFormState(updateRaffleStatusAction, { success: false, message: "" });
    const { toast } = useToast();

    useEffect(() => {
        if (state.message) {
            toast({
                title: state.success ? "Acción Completada" : "Ocurrió un Error",
                description: state.message,
                variant: state.success ? "default" : "destructive",
            });
        }
    }, [state, toast]);

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {triggerButton}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        {icon}
                        {title}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Volver</AlertDialogCancel>
                    <form action={formAction}>
                        <input type="hidden" name="raffleId" value={raffleId} />
                        <input type="hidden" name="status" value={newStatus} />
                        <AlertDialogAction asChild>
                            <SubmitButton variant={confirmButtonVariant}>
                                {confirmText}
                            </SubmitButton>
                        </AlertDialogAction>
                    </form>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


// --- Componente principal con los botones actualizados ---
interface StatusActionsProps {
    raffle: {
        id: string;
        status: string;
    };
}

export function StatusActions({ raffle }: StatusActionsProps) {
    switch (raffle.status) {
        case 'draft':
            return (
                <ActionConfirmationDialog
                    raffleId={raffle.id}
                    newStatus="active"
                    title="¿Activar esta rifa?"
                    description="La rifa será visible públicamente y se podrán comprar tickets. Esta acción no se puede deshacer."
                    confirmText="Sí, activar"
                    icon={<Play className="h-5 w-5 text-green-600" />}
                    // === CAMBIO AQUÍ ===
                    triggerButton={
                        <Button
                            size="sm"
                            className="text-white font-semibold shadow-md bg-gradient-to-r from-green-500 to-green-600 transition-all duration-200 hover:scale-105 active:scale-95"
                        >
                            <Play className="h-4 w-4 mr-2" />
                            Activar Rifa
                        </Button>
                    }
                />
            );

        case 'active':
            return (
                <div className="flex items-center gap-2">
                    <ActionConfirmationDialog
                        raffleId={raffle.id}
                        newStatus="finished"
                        title="¿Finalizar la rifa?"
                        description="Se detendrá la venta de tickets permanentemente. Asegúrate de que el sorteo ya se haya realizado para poder registrar al ganador."
                        confirmText="Sí, finalizar"
                        icon={<Square className="h-5 w-5 text-blue-600" />}
                        // === CAMBIO AQUÍ ===
                        triggerButton={
                            <Button
                                size="sm"
                                className="text-white font-semibold shadow-md bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <Square className="h-4 w-4 mr-2" />
                                Finalizar
                            </Button>
                        }
                    />
                    <ActionConfirmationDialog
                        raffleId={raffle.id}
                        newStatus="cancelled"
                        title="¿Está seguro que desea cancelar la rifa?"
                        description="Esta acción es irreversible, detendrá la venta de tickets y marcará la rifa como cancelada."
                        confirmText="Sí, cancelar"
                        confirmButtonVariant="destructive"
                        icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
                        // === CAMBIO AQUÍ ===
                        triggerButton={
                            <Button
                                size="sm"
                                className="text-white font-semibold shadow-md bg-gradient-to-r from-red-500 to-red-600 transition-all duration-200 hover:scale-105 active:scale-95"
                            >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                            </Button>
                        }
                    />
                </div>
            );

        default:
            return null;
    }
}