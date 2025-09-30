"use server";

import { z } from "zod";
import { db } from "./db";
import { referrals } from "./db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./actions"; // ✅ Importamos tu función de seguridad

// Esquema de validación para el formulario de creación de referidos
const CreateReferralSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  email: z.string().email("El correo no es válido."),
  // El código es opcional y se valida solo si se proporciona
  code: z.string().length(4, "El código debe tener 4 dígitos.").optional().or(z.literal('')),
});

/**
 * Server Action para crear una nueva cuenta de referido.
 * Es segura y solo puede ser ejecutada por un administrador.
 */
export async function createReferralAction(prevState: any, formData: FormData) {
  try {
    await requireAdmin(); // 1. Seguridad: Verifica que el usuario sea administrador

    const validatedFields = CreateReferralSchema.safeParse(
      Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
      return { success: false, message: "Datos del formulario inválidos." };
    }

    const { name, email } = validatedFields.data;
    let { code } = validatedFields.data;

    // 2. Verificar si el email ya existe para evitar duplicados
    const existingEmail = await db.query.referrals.findFirst({
      where: eq(referrals.email, email.toLowerCase()),
    });
    if (existingEmail) {
      return { success: false, message: "Este correo electrónico ya está en uso." };
    }

    // 3. Manejar el código de 4 dígitos
    if (code) {
      // Si el admin ingresó un código, verificar que no exista
      const existingCode = await db.query.referrals.findFirst({
        where: eq(referrals.code, code),
      });
      if (existingCode) {
        return { success: false, message: `El código "${code}" ya está en uso. Elige otro.` };
      }
    } else {
      // Si el admin dejó el campo en blanco, generar uno único
      let isUnique = false;
      while (!isUnique) {
        code = Math.floor(1000 + Math.random() * 9000).toString();
        const existingCode = await db.query.referrals.findFirst({
          where: eq(referrals.code, code),
        });
        if (!existingCode) {
          isUnique = true;
        }
      }
    }

    // 4. Insertar el nuevo referido en la base de datos
    await db.insert(referrals).values({
      name,
      email: email.toLowerCase(),
      code,
    });

    revalidatePath("/admin/referidos"); // 5. Actualizar la caché de la página de admin
    return { success: true, message: `Referido "${name}" creado con el código "${code}".` };

  } catch (error: any) {
    console.error("Error al crear referido:", error);
    return { success: false, message: error.message || "Error del servidor." };
  }
}

/**
 * Server Action para activar o desactivar una cuenta de referido.
 * Es segura y solo puede ser ejecutada por un administrador.
 */
export async function toggleReferralStatusAction(prevState: any, formData: FormData) {
    try {
        await requireAdmin(); // 1. Seguridad: Verifica que el usuario sea administrador

        const id = formData.get('id') as string;
        const currentState = formData.get('currentState') === 'true';

        if (!id) {
            return { success: false, message: "ID del referido no proporcionado." };
        }

        // 2. Actualizar el estado 'isActive' en la base de datos
        await db.update(referrals)
            .set({ isActive: !currentState })
            .where(eq(referrals.id, id));

        revalidatePath('/admin/referidos'); // 3. Actualizar la caché
        return { success: true, message: "Estado del referido actualizado." };

    } catch (error: any) {
        console.error("Error al cambiar estado de referido:", error);
        return { success: false, message: error.message || "Error del servidor." };
    }
}