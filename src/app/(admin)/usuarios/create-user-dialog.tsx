"use client"

// Imports de React y hooks
import { useState, useEffect } from "react"
import { useFormState, useFormStatus } from "react-dom"

// Import de la Server Action y utilidades
import { registerAction } from "@/lib/actions"
import { toast } from "sonner"

// Imports de componentes de UI (shadcn/ui)
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Import del componente personalizado para seleccionar roles
import { RoleCombobox } from "./role-combobox"

/**
 * Componente de botón de envío que muestra un estado de carga.
 * Utiliza el hook `useFormStatus` para deshabilitarse mientras la acción del formulario se está ejecutando.
 */
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} aria-disabled={pending}>
            {pending ? "Creando usuario..." : "Crear Usuario"}
        </Button>
    )
}

/**
 * Componente principal del diálogo para crear un nuevo usuario.
 * Maneja el estado del formulario, la apertura/cierre del modal y las notificaciones.
 */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState("user");

  // Hook `useFormState` para manejar la respuesta de la Server Action
  const [state, formAction] = useFormState(registerAction, { success: false, message: "" });

  // Hook `useEffect` para mostrar notificaciones (toasts) basadas en la respuesta de la acción
  useEffect(() => {
    // Si no hay mensaje, no hacer nada.
    if (!state.message) return;

    if (state.success) {
      toast.success("¡Éxito!", { description: state.message });
      setOpen(false); // Cierra el modal si el usuario se creó correctamente
    } else {
      toast.error("Error al crear usuario", { description: state.message });
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Crear Usuario</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Crear nuevo usuario</DialogTitle>
          <DialogDescription>
            Completa los datos para añadir un nuevo administrador o usuario al sistema.
          </DialogDescription>
        </DialogHeader>
        {/* El formulario llama a la server action envuelta por useFormState */}
        <form action={formAction}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nombre</Label>
              <Input id="name" name="name" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Contraseña</Label>
              <Input id="password" name="password" type="password" className="col-span-3" required minLength={6} />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="role" className="text-right">Rol</Label>
               {/* Campo oculto para enviar el rol seleccionado en el formulario */}
               <input type="hidden" name="role" value={role} />
               <RoleCombobox value={role} setValue={setRole} />
            </div>
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
