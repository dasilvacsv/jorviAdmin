// app/(admin)/usuarios/columns.tsx
"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteUserAction } from "@/lib/actions"
import { useFormState } from "react-dom"
import { toast } from "sonner"
import { useEffect } from "react"

// Se define el tipo de dato que usará la tabla
type User = {
  id: string
  name: string | null
  email: string
  role: "admin" | "user"
  createdAt: Date
}

// Componente para manejar la acción de eliminar desde el menú
function DeleteUserMenuItem({ userId }: { userId: string }) {
    const [state, formAction] = useFormState(deleteUserAction, { success: false, message: "" });

    useEffect(() => {
        if (state.message) {
            state.success ? toast.success(state.message) : toast.error(state.message);
        }
    }, [state]);

    return (
        <form action={formAction} className="w-full">
            <input type="hidden" name="id" value={userId} />
            <button type="submit" className="w-full text-left text-destructive">
                Eliminar
            </button>
        </form>
    );
}

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Nombre <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Rol",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      const variant = role === 'admin' ? 'bg-amber-500/20 text-amber-700' : 'bg-green-500/20 text-green-700';
      return (
        <span className={`px-3 py-1 text-xs font-medium rounded-full ${variant}`}>
          {role}
        </span>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: "createdAt",
    header: "Fecha de Creación",
    cell: ({ row }) => new Date(row.getValue("createdAt")).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menú</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
              Copiar email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <DeleteUserMenuItem userId={user.id} />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]