// lib/actions-sellers.ts - Acciones para la configuración del sistema
"use server";

import { z } from "zod";
import { db } from "./db";
import { systemSettings, raffleExchangeRates, raffles } from "./db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, inArray } from "drizzle-orm";
import { auth } from "./auth";

/**
 * Verifica si el usuario actual tiene rol de administrador.
 * Lanza un error si no es así.
 */
async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    throw new Error("Acceso denegado. Permisos de administrador requeridos.");
  }
  return session;
}

// Tipo de estado estándar para las respuestas de las acciones del servidor
export type ActionState = {
  success: boolean;
  message: string;
  data?: any;
};

// ================================================================
// ACCIONES PARA CONFIGURACIÓN DEL SISTEMA (ADMIN)
// ================================================================

const UpdateSystemSettingSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

/**
 * Acción para crear o actualizar una configuración global del sistema.
 */
export async function updateSystemSettingAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const validatedFields = UpdateSystemSettingSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return { success: false, message: "Datos inválidos." };
  }

  const { key, value, description } = validatedFields.data;

  try {
    const existing = await db.query.systemSettings.findFirst({
      where: eq(systemSettings.key, key),
    });

    if (existing) {
      await db
        .update(systemSettings)
        .set({ value, description, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value, description });
    }

    revalidatePath("/admin/settings");
    return { success: true, message: "Configuración actualizada exitosamente." };
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    return { success: false, message: "Error al actualizar la configuración." };
  }
}

const UpdateRaffleExchangeRateSchema = z.object({
  raffleId: z.string(),
  usdToVesRate: z.coerce.number().positive("La tasa debe ser un número positivo."),
});

/**
 * Acción para crear o actualizar la tasa de cambio específica de una rifa.
 */
export async function updateRaffleExchangeRateAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const validatedFields = UpdateRaffleExchangeRateSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return { success: false, message: "Datos inválidos." };
  }

  const { raffleId, usdToVesRate } = validatedFields.data;

  try {
    const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
    if (!raffle) {
      return { success: false, message: "Rifa no encontrada." };
    }

    const existing = await db.query.raffleExchangeRates.findFirst({
      where: eq(raffleExchangeRates.raffleId, raffleId),
    });

    if (existing) {
      await db
        .update(raffleExchangeRates)
        .set({ usdToVesRate: usdToVesRate.toString(), updatedAt: new Date() })
        .where(eq(raffleExchangeRates.raffleId, raffleId));
    } else {
      await db.insert(raffleExchangeRates).values({
        raffleId,
        usdToVesRate: usdToVesRate.toString(),
      });
    }

    revalidatePath("/admin/settings");
    revalidatePath(`/rifa/${raffleId}`);
    return { success: true, message: "Tasa de cambio actualizada exitosamente." };
  } catch (error) {
    console.error("Error al actualizar tasa de cambio:", error);
    return { success: false, message: "Error al actualizar la tasa de cambio." };
  }
}

// ================================================================
// FUNCIONES DE CONSULTA DE DATOS
// ================================================================

/**
 * Obtiene todas las configuraciones del sistema y las devuelve como un objeto.
 */
export async function getSystemSettings() {
  try {
    const settings = await db.query.systemSettings.findMany({
      where: eq(systemSettings.isActive, true),
      orderBy: systemSettings.key,
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    return settingsMap;
  } catch (error) {
    console.error("Error al obtener configuraciones del sistema:", error);
    return {};
  }
}

/**
 * Obtiene la tasa de cambio específica para una sola rifa.
 */
export async function getRaffleExchangeRate(raffleId: string): Promise<number | null> {
  try {
    const rate = await db.query.raffleExchangeRates.findFirst({
      where: eq(raffleExchangeRates.raffleId, raffleId),
    });

    return rate ? parseFloat(rate.usdToVesRate) : null;
  } catch (error) {
    console.error("Error al obtener tasa de cambio de la rifa:", error);
    return null;
  }
}

/**
 * Obtiene todas las rifas activas y finalizadas junto con sus tasas de cambio.
 */
export async function getAllRafflesWithRates() {
  try {
    const activeRaffles = await db.query.raffles.findMany({
      where: inArray(raffles.status, ['active', 'finished']),
      orderBy: desc(raffles.createdAt),
    });

    const rafflesWithRates = await Promise.all(
      activeRaffles.map(async (raffle) => {
        const rate = await db.query.raffleExchangeRates.findFirst({
          where: eq(raffleExchangeRates.raffleId, raffle.id),
        });

        return {
          ...raffle,
          exchangeRate: rate ? parseFloat(rate.usdToVesRate) : null,
        };
      })
    );

    return rafflesWithRates;
  } catch (error) {
    console.error("Error al obtener rifas con tasas:", error);
    return [];
  }
}