// app/(admin)/usuarios/components.tsx
"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { registerAction, deleteUserAction } from "@/lib/actions";
import type { users } from "@/lib/db/schema";

// --- Tipos ---
type User = typeof users.$inferSelect;
type ActionState = {
  success: boolean;
  message: string;
};

// --- Componentes Reutilizables ---
function SubmitButton({ text, pendingText }: { text: string, pendingText: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
    >
      {pending ? pendingText : text}
    </button>
  );
}

// --- Formulario y Modal para Crear Usuario ---
export function CreateUserButton() {
  const [isOpen, setIsOpen] = useState(false);
  const initialState = { success: false, message: "" };
  const [state, formAction] = useFormState(registerAction, initialState);

  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        setIsOpen(false);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700"
      >
        + Crear Usuario
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md m-4">
            <h2 className="text-2xl font-bold mb-6">Nuevo Usuario</h2>
            <form action={formAction}>
              {/* Campos del formulario */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input type="text" id="name" name="name" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" id="email" name="email" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input type="password" id="password" name="password" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
                  <select id="role" name="role" defaultValue="user" className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    <option value="user">Usuario</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-4 mt-8">
                 <button type="button" onClick={() => setIsOpen(false)} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                 <SubmitButton text="Crear Usuario" pendingText="Creando..." />
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// --- Botón de Eliminar Usuario (usa un formulario) ---
function DeleteUserForm({ userId }: { userId: string }) {
    const initialState = { success: false, message: "" };
    const [state, formAction] = useFormState(deleteUserAction, initialState);

    useEffect(() => {
        if (state.message) {
            state.success ? toast.success(state.message) : toast.error(state.message);
        }
    }, [state]);
    
    // Usamos un formulario para que el botón pueda invocar la Server Action
    return (
        <form action={formAction} onSubmit={(e) => {
            if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) {
                e.preventDefault();
            }
        }}>
            <input type="hidden" name="id" value={userId} />
            <button type="submit" className="text-red-600 hover:text-red-900 font-medium">Eliminar</button>
        </form>
    );
}

// --- Tabla de Usuarios ---
export function UsersTable({ users }: { users: User[] }) {
  if (users.length === 0) {
    return <p className="text-center py-10 text-gray-500">No hay usuarios registrados.</p>;
  }

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha de Creación</th>
            <th scope="col" className="relative px-6 py-3"><span className="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  user.role === 'admin' 
                    ? 'bg-red-100 text-red-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {user.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(user.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                 <DeleteUserForm userId={user.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}