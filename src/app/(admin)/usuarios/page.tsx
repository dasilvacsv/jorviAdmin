// app/(admin)/usuarios/page.tsx
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { columns } from "./columns";
import { UsersDataTable } from "./data-table";
import { CreateUserDialog } from "./create-user-dialog";

// Revalidación para asegurar datos frescos
export const revalidate = 0;

export default async function UsuariosPage() {
  const allUsers = await db.query.users.findMany({
    orderBy: desc(users.createdAt),
  });

  return (
    <div className="container mx-auto py-10">
      <header className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
            <p className="text-muted-foreground">
                Gestiona los usuarios del sistema, sus roles y permisos.
            </p>
        </div>
        <CreateUserDialog />
      </header>
      <main>
        <UsersDataTable columns={columns} data={allUsers} />
      </main>
    </div>
  );
}