// lib/actions.ts
"use server";

import { z } from "zod";
import { db } from "./db";
import {
  raffles,
  purchases,
  tickets,
  purchaseStatusEnum,
  users,
  raffleStatusEnum,
  raffleImages,
  paymentMethods,
  currencyEnum,
  rejectionReasonEnum,
  waitlistSubscribers,
  referralLinks,
  referrals,
} from "./db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, inArray, and, lt, sql, like, ne, asc, or, isNull, isNotNull, not } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { uploadToS3, deleteFromS3 } from "./s3";
import crypto from "crypto";
import { Resend } from "resend";
import { sendWhatsappMessage } from "@/features/whatsapp/actions";
import { auth } from "./auth";
import { PurchaseWithTicketsAndRaffle, RaffleSalesData } from "./types";
import { SortingState } from "@tanstack/react-table";
import { Purchase } from '@/lib/types';

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Credenciales de Pabilo
const PABILO_API_KEY = process.env.PABILO_API_KEY;
const PABILO_API_URL = process.env.PABILO_API_URL;

export async function requireAdmin() {
    const session = await auth();
    if (session?.user?.role !== 'admin') {
        throw new Error("Acceso denegado. Permisos de administrador requeridos.");
    }
    return session;
}

// --- TIPOS DE RESPUESTA
export type ActionState = {
  success: boolean;
  message: string;
  data?: any;
};

// ----------------------------------------------------------------
// Funciones de Utilidad
// ----------------------------------------------------------------

/**
 * Convierte una cadena de texto a un slug (ej. "Mi Rifa Genial" -> "mi-rifa-genial")
 * @param text El texto a convertir.
 * @returns El slug generado.
 */
function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD") // Normaliza los caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remueve diacríticos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Reemplaza espacios con guiones
    .replace(/[^\w-]+/g, "") // Remueve caracteres no alfanuméricos
    .replace(/--+/g, "-"); // Reemplaza múltiples guiones con uno solo
}

// ----------------------------------------------------------------
// ACTIONS PARA AUTENTICACIÓN
// ----------------------------------------------------------------

const RegisterSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function registerAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
 
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { success: false, message: "Error de validación" };
  
  const { name, email, password } = validatedFields.data;

  try {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) return { success: false, message: "El email ya está registrado" };

    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = await db.insert(users).values({ name, email, password: hashedPassword, role: 'user' }).returning({ id: users.id });
    
    revalidatePath("/usuarios");
    return { success: true, message: "Usuario registrado exitosamente", data: newUser[0] };

  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return { success: false, message: "Error del servidor" };
  }
}

// ----------------------------------------------------------------
// FUNCIONES INTERNAS DE NOTIFICACIÓN
// ----------------------------------------------------------------

/**
 * Revisa si una compra confirmada contiene uno de los "Tickets Premium"
 * y notifica a un número de administrador si se encuentra un ganador.
 * @param purchaseId El ID de la compra que acaba de ser confirmada.
 */
async function checkAndNotifyMagicTicketWinner(purchaseId: string): Promise<void> {
    // --- CONFIGURACIÓN DE LA DINÁMICA ---
    const MAGIC_TICKETS = ['9578', '1988', '0510'];
    const ADMIN_WHATSAPP_NUMBER = '584123604755'; // Tu número para recibir el aviso.
    // ------------------------------------

    console.log(`Verificando Tickets Premium para la compra #${purchaseId}...`);

    try {
        const purchaseData = await db.query.purchases.findFirst({
            where: eq(purchases.id, purchaseId),
            with: {
                raffle: { columns: { name: true } },
                tickets: { columns: { ticketNumber: true } },
            },
        });

        if (!purchaseData) {
            console.error(`[Magic Ticket] No se encontró la compra ${purchaseId} para verificar.`);
            return;
        }

        const winningTickets = purchaseData.tickets.filter(ticket =>
            MAGIC_TICKETS.includes(ticket.ticketNumber)
        );

        if (winningTickets.length > 0) {
            const winnerName = purchaseData.buyerName;
            const raffleName = purchaseData.raffle.name;
            const winningTicketNumbers = winningTickets.map(t => t.ticketNumber).join(', ');

            console.log(`¡GANADOR ENCONTRADO! Ticket ${winningTicketNumbers} para ${winnerName}. Notificando al admin...`);
            const notificationMessage = `🚨 ¡Alerta de Ganador "Ticket Premium"! 🚨\n\nEl comprador *${winnerName}* acaba de asegurar el ticket ganador número *${winningTicketNumbers}* para la rifa "${raffleName}".\n\n¡Has encontrado a uno de los ganadores de $100! 💸`;

            await sendWhatsappMessage(ADMIN_WHATSAPP_NUMBER, notificationMessage);
            console.log(`Notificación de Ticket Premium enviada a ${ADMIN_WHATSAPP_NUMBER}.`);
        } else {
            console.log(`La compra #${purchaseId} no contenía Tickets Premium.`);
        }
    } catch (error) {
        console.error(`[ERROR] Falló el proceso de notificación del Ticket Premium para la compra #${purchaseId}:`, error);
    }
}

async function sendRejectionNotification(
  purchaseId: string,
  reason: 'invalid_payment' | 'malicious',
  comment?: string | null
): Promise<void> {
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: { raffle: true },
  });

  if (!purchase) {
    console.error(`No se encontró la compra con ID: ${purchaseId} para notificar rechazo.`);
    return;
  }
  
  let subject = `Problema con tu compra para la rifa ${purchase.raffle.name}`;
  let mainMessage: string;
  let additionalComment: string = '';

  if (reason === 'invalid_payment') {
    mainMessage = "Lastimosamente no pudimos verificar tu pago. Por favor, revisa los datos de tu comprobante e intenta tu compra de nuevo. Si crees que se trata de un error, contáctanos.";
  } else { // 'malicious'
    mainMessage = "Lastimosamente no pudimos verificar tu pago. Tu compra ha sido marcada como rechazada por nuestro sistema.";
    if (comment) {
      additionalComment = `<p><strong>Motivo adicional:</strong> ${comment}</p>`;
    }
  }

  const emailBody = `
    <h1>Hola, ${purchase.buyerName}</h1>
    <p>${mainMessage}</p>
    ${additionalComment}
    <p>El equipo de Llevateloconjorvi.</p>
  `;

  const whatsappText = `Hola, ${purchase.buyerName} 👋\n\n${mainMessage.replace(/<br\s*\/?>/gi, '\n')}\n\n${comment ? `*Motivo adicional:* ${comment}\n\n` : ''}El equipo de Llevateloconjorvi.`;
  
  await sendEmail({ to: purchase.buyerEmail, subject, body: emailBody });

  if (purchase.buyerPhone && purchase.buyerPhone.trim() !== '') {
    console.log(`Intentando enviar WhatsApp de rechazo a: ${purchase.buyerPhone}`);
    try {
      await sendWhatsappMessage(purchase.buyerPhone, whatsappText);
      console.log(`WhatsApp de rechazo enviado con éxito a ${purchase.buyerPhone}`);
    } catch (error) {
      console.error(`ERROR al enviar WhatsApp de rechazo a ${purchase.buyerPhone}:`, error);
    }
  } else {
    console.warn(`No se envió WhatsApp de rechazo para la compra #${purchase.id} por falta de número.`);
  }
}

export async function getTopBuyers(raffleId: string): Promise<{ buyerName: string | null; buyerEmail: string; totalTickets: number }[]> {
  try {
    const topBuyersData = await db
      .select({
        buyerName: purchases.buyerName,
        buyerEmail: purchases.buyerEmail,
        totalTickets: sql<number>`sum(${purchases.ticketCount})`.mapWith(Number),
      })
      .from(purchases)
      .where(and(
        eq(purchases.raffleId, raffleId),
        eq(purchases.status, 'confirmed')
      ))
      .groupBy(purchases.buyerName, purchases.buyerEmail)
      .orderBy(desc(sql`sum(${purchases.ticketCount})`))
      .limit(10);

    return topBuyersData;

  } catch (error) {
    console.error("Error al obtener top compradores:", error);
    return [];
  }
}

// ----------------------------------------------------------------
// NUEVA FUNCIONALIDAD: OBTENER DETALLES DE UNA VENTA Y REFERENCIAS SIMILARES
// ----------------------------------------------------------------

export type SaleDetailData = {
  purchase: {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    buyerPhone: string | null;
    paymentReference: string | null;
    paymentMethod: string | null;
    paymentScreenshotUrl: string | null;
    amount: string;
    ticketCount: number;
    status: 'pending' | 'confirmed' | 'rejected';
    createdAt: Date;
    rejectionReason: string | null;
    rejectionComment: string | null;
    raffle: {
      id: string;
      name: string;
      currency: 'USD' | 'VES';
    };
    referralLink: {
      name: string;
      code: string;
    } | null;
    tickets: {
      ticketNumber: string;
    }[];
  };
  similarReferences: {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    paymentReference: string | null;
    amount: string;
    status: string;
    createdAt: Date;
    raffle: {
      name: string;
    };
  }[];
};

/**
 * Obtiene los detalles de una venta específica y busca referencias similares
 * @param saleId ID de la venta
 * @returns Datos de la venta y referencias similares
 */
export async function getSaleDetails(saleId: string): Promise<SaleDetailData | null> {
  try {
    // Verificar permisos de administrador
    await requireAdmin();

    // Obtener la venta principal con toda su información
    const sale = await db.query.purchases.findFirst({
      where: eq(purchases.id, saleId),
      with: {
        raffle: {
          columns: { id: true, name: true, currency: true }
        },
        referralLink: {
          columns: { name: true, code: true }
        },
        tickets: {
          columns: { ticketNumber: true }
        }
      }
    });

    if (!sale) {
      return null;
    }

    // Buscar referencias similares (últimos 4 dígitos)
    let similarReferences: any[] = [];
    
    if (sale.paymentReference && sale.paymentReference.length >= 4) {
      const lastFourDigits = sale.paymentReference.slice(-4);
      
      // Buscar otras compras que terminen con los mismos 4 dígitos
      similarReferences = await db.query.purchases.findMany({
        where: and(
          like(purchases.paymentReference, `%${lastFourDigits}`),
          ne(purchases.id, saleId) // Excluir la venta actual
        ),
        with: {
          raffle: {
            columns: { name: true }
          }
        },
        orderBy: desc(purchases.createdAt),
        limit: 10 // Limitar a 10 resultados
      });
    }

    return {
      purchase: sale,
      similarReferences
    };

  } catch (error) {
    console.error("Error al obtener detalles de la venta:", error);
    return null;
  }
}

// ----------------------------------------------------------------
// ACTIONS PARA ENVÍO DE CORREO
// ----------------------------------------------------------------

interface EmailData {
  to: string;
  subject: string;
  body: string;
}

async function sendEmail({ to, subject, body }: EmailData): Promise<void> {
  try {
    const { data, error } = await resend.emails.send({
      from: "Llevateloconjorvi <ventas@llevateloconjorvi.com>",
      to: [to],
      subject: subject,
      html: body,
    });

    if (error) {
      console.error("Error de la API de Resend al enviar correo:", error);
      throw new Error(error.message);
    }
    console.log("Correo enviado con éxito a:", to);
  } catch (error) {
    console.error("Error general al enviar el correo:", error);
  }
}

/**
 * Envía una notificación de felicitación al ganador de la rifa por correo y WhatsApp.
 * @param raffleId El ID de la rifa.
 * @param winnerTicketId El ID del ticket ganador.
 */
async function sendWinnerNotification(raffleId: string, winnerTicketId: string): Promise<void> {
  // 1. Obtener toda la información necesaria con una sola consulta
  const winnerData = await db.query.tickets.findFirst({
    where: eq(tickets.id, winnerTicketId),
    with: {
      raffle: {
        columns: { name: true }
      },
      purchase: {
        columns: {
          buyerName: true,
          buyerEmail: true,
          buyerPhone: true,
        }
      }
    }
  });

  // 2. Validar que se encontró toda la información
  if (!winnerData || !winnerData.purchase || !winnerData.raffle) {
    console.error(`No se pudo encontrar la información completa para notificar al ganador del ticket ID: ${winnerTicketId}`);
    return;
  }

  const { raffle, purchase, ticketNumber } = winnerData;
  const buyerName = purchase.buyerName || 'Ganador';

  // 3. Construir los mensajes
  const subject = `¡Felicidades! Eres el ganador de la rifa "${raffle.name}" 🎉`;
  
  const emailBody = `
    <h1>¡Felicidades, ${buyerName}!</h1>
    <p>¡Tenemos noticias increíbles! Has resultado ser el afortunado ganador de la rifa <strong>${raffle.name}</strong> con tu ticket número:</p>
    <p style="font-size: 2rem; font-weight: bold; color: #22c55e; text-align: center; margin: 20px 0;">${ticketNumber}</p>
    <p>Pronto nuestro equipo se pondrá en contacto contigo para coordinar la entrega de tu premio.</p>
    <p>¡Gracias por participar y confiar en nosotros!</p>
    <p>El equipo de Llevateloconjorvi.</p>
  `;

  const whatsappText = `🎉 ¡Felicidades, ${buyerName}! 🎉\n\n¡Eres el afortunado ganador de la rifa *${raffle.name}* con tu ticket número *${ticketNumber}*! 🥳\n\nPronto nos pondremos en contacto contigo para coordinar la entrega de tu premio. ¡Gracias por participar!`;

  // 4. Enviar las notificaciones
  // Envío de correo
  await sendEmail({ to: purchase.buyerEmail, subject, body: emailBody });

  // Envío de WhatsApp (con verificación)
  if (purchase.buyerPhone && purchase.buyerPhone.trim() !== '') {
    console.log(`Intentando enviar WhatsApp de ganador a: ${purchase.buyerPhone}`);
    try {
      await sendWhatsappMessage(purchase.buyerPhone, whatsappText);
      console.log(`WhatsApp de ganador enviado con éxito a ${purchase.buyerPhone}`);
    } catch (error) {
      console.error(`ERROR al enviar WhatsApp de ganador a ${purchase.buyerPhone}:`, error);
    }
  } else {
    console.warn(`No se envió WhatsApp al ganador de la rifa #${raffleId} por falta de número de teléfono.`);
  }
}


async function sendConfirmationEmail(purchaseId: string): Promise<void> {
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: { raffle: true },
  });

  if (!purchase) return;

  const subject = `Confirmación de compra en Llevateloconjorvi - #${purchase.id}`;
  const body = `
    <h1>¡Hola, ${purchase.buyerName}!</h1>
    <p>Gracias por tu compra en Llevateloconjorvi. Hemos recibido tu solicitud para la rifa: <strong>${purchase.raffle.name}</strong>.</p>
    <p>Tu compra está en estado <strong>pendiente</strong>. Una vez que nuestro equipo revise y confirme tu pago, recibirás un nuevo correo con tus tickets asignados.</p>
    <p><strong>Detalles de la compra:</strong></p>
    <ul>
      <li>Monto: ${purchase.amount} ${purchase.raffle.currency}</li>
      <li>Cantidad de Tickets: ${purchase.ticketCount}</li>
      <li>Referencia de pago: ${purchase.paymentReference}</li>
    </ul>
    <p>¡Te notificaremos pronto!</p>
    <p>El equipo de Llevateloconjorvi.</p>
  `;
  await sendEmail({ to: purchase.buyerEmail, subject, body });
}

/**
 * Envía un correo Y un mensaje de WhatsApp con los tickets asignados.
 * @param purchaseId ID de la compra
 */
async function sendTicketsEmailAndWhatsapp(purchaseId: string): Promise<void> {
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: {
      raffle: true,
      tickets: { columns: { ticketNumber: true } },
    },
  });

  if (!purchase) {
    console.error(`No se encontró la compra con ID: ${purchaseId}`);
    return;
  }

  const ticketNumbers = purchase.tickets.map((t) => t.ticketNumber).sort().join(", ");
  const subject = `¡Tus tickets para la rifa ${purchase.raffle.name} han sido aprobados! 🎉`;
  const emailBody = `
    <h1>¡Felicidades, ${purchase.buyerName}!</h1>
    <p>Tu compra para la rifa <strong>${purchase.raffle.name}</strong> ha sido <strong>confirmada</strong>.</p>
    <p>Estos son tus tickets de la suerte:</p>
    <p style="font-size: 1.5rem; font-weight: bold; color: #f97316;">${ticketNumbers}</p>
    <p>¡Mucha suerte en el sorteo! El ganador será anunciado en nuestra página web y redes sociales.</p>
    <p>Por favor, únete a nuestro WhatsApp para las dinámicas donde puedes ganar con nosotros: <a href="https://chat.whatsapp.com/DJ7cNWxa7VPKcFpoQBdlyz">https://chat.whatsapp.com/DJ7cNWxa7VPKcFpoQBdlyz</a></p>
    <p>El equipo de Llevateloconjorvi.</p>
  `;
  
  // 1. Envío del correo (esto ya funcionaba)
  await sendEmail({ to: purchase.buyerEmail, subject, body: emailBody });

  // 2. Envío del mensaje de WhatsApp con verificación y manejo de errores
  const whatsappText = `¡Hola, ${purchase.buyerName}! 🎉\n\nTu compra para la rifa *${purchase.raffle.name}* ha sido confirmada.\n\nAquí están tus tickets de la suerte:\n\n*${ticketNumbers}*\n\nEl sorteo será este domingo 02/11/2025 a las 10pm por el Super Gana de la lotería del táchira https://supergana.com.ve/resultados.php, la plataforma cerrará a las 8pm.\n\nRecuerda que también tendremos un premio para el que tenga más tickets. Puedes ver el top de compradores aquí:\nhttps://www.llevateloconjorvi.com/top-compradores\n\nPor favor, únete a nuestro WhatsApp para las dinámicas donde puedes ganar con nosotros:\nhttps://chat.whatsapp.com/DJ7cNWxa7VPKcFpoQBdlyz\n\n¡Participa y gana! 😉`;
  
  // --- MEJORA CLAVE ---
  // Verificamos si existe el número de teléfono antes de intentar enviar.
  if (purchase.buyerPhone && purchase.buyerPhone.trim() !== '') {
    console.log(`Intentando enviar WhatsApp al número: ${purchase.buyerPhone}`);
    try {
      // Envolvemos la llamada en un try...catch para capturar cualquier error.
      await sendWhatsappMessage(purchase.buyerPhone, whatsappText);
      console.log(`WhatsApp enviado con éxito a ${purchase.buyerPhone}`);
    } catch (error) {
      // Si hay un error, lo mostraremos en la consola del servidor para poder depurarlo.
      console.error(`ERROR al enviar WhatsApp a ${purchase.buyerPhone}:`, error);
    }
  } else {
    console.warn(`No se envió WhatsApp para la compra #${purchase.id} porque no se proporcionó un número de teléfono.`);
  }
}

async function sendConfirmationWhatsapp(purchaseId: string): Promise<void> {
  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.id, purchaseId),
    with: { raffle: true },
  });

  if (!purchase || !purchase.buyerPhone) {
    console.warn(`No se envió WhatsApp de confirmación para la compra #${purchaseId} por falta de número.`);
    return;
  }
  
  const text = `¡Hola, ${purchase.buyerName}! 👋\n\nRecibimos tu solicitud de compra para la rifa *${purchase.raffle.name}*. \n\nTu pago está siendo verificado. Te notificaremos por aquí una vez que sea aprobado. ¡Gracias por participar!`;

  try {
    console.log(`Intentando enviar WhatsApp de confirmación a: ${purchase.buyerPhone}`);
    const result = await sendWhatsappMessage(purchase.buyerPhone, text);
    if (result.success) {
      console.log(`WhatsApp de confirmación enviado con éxito a ${purchase.buyerPhone}`);
    } else {
      console.error(`Falló el envío de WhatsApp de confirmación a ${purchase.buyerPhone}:`, result.error);
    }
  } catch (error) {
    console.error(`ERROR CATASTRÓFICO al enviar WhatsApp de confirmación:`, error);
  }
}

// ----------------------------------------------------------------
// ACTIONS PARA COMPRAS Y TICKETS
// ----------------------------------------------------------------

const ReserveTicketsSchema = z.object({
  raffleId: z.string(),
  ticketCount: z.coerce.number().int().min(1),
});

export async function reserveTicketsAction(formData: FormData): Promise<ActionState> {
  const validatedFields = ReserveTicketsSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { success: false, message: "Datos inválidos." };
  
  const { raffleId, ticketCount } = validatedFields.data;
  const RESERVATION_MINUTES = 10;

  try {
    const reservedData = await db.transaction(async (tx) => {
      // Check if raffle exists and is active
      const raffle = await tx.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
      if (!raffle) throw new Error("Rifa no encontrada.");
      if (raffle.status !== 'active') throw new Error("La rifa no está activa.");

      // Check if tickets exist for this raffle
      const existingTicketsCount = await tx.select({ count: sql`count(*)` })
        .from(tickets)
        .where(eq(tickets.raffleId, raffleId));
      
      // If no tickets exist, generate them
      if (Number(existingTicketsCount[0].count) === 0) {
        console.log(`Generando tickets para la rifa ${raffleId}...`);
        const ticketsToGenerate = [];
        for (let i = 0; i < 10000; i++) {
          const ticketNumber = i.toString().padStart(4, '0');
          ticketsToGenerate.push({
            ticketNumber,
            raffleId,
            status: 'available' as const,
          });
        }

        // Insert tickets in batches
        const batchSize = 1000;
        for (let i = 0; i < ticketsToGenerate.length; i += batchSize) {
          const batch = ticketsToGenerate.slice(i, i + batchSize);
          await tx.insert(tickets).values(batch);
        }
        console.log(`Tickets generados exitosamente para la rifa ${raffleId}`);
      }

      // Clean up expired reservations
      await tx.update(tickets).set({ status: 'available', reservedUntil: null, purchaseId: null }).where(and(eq(tickets.raffleId, raffleId), eq(tickets.status, 'reserved'), lt(tickets.reservedUntil, new Date())));
      
      // Find available tickets
      const availableTickets = await tx.select({ id: tickets.id, ticketNumber: tickets.ticketNumber }).from(tickets).where(and(eq(tickets.raffleId, raffleId), eq(tickets.status, 'available'))).orderBy(sql`RANDOM()`).limit(ticketCount).for("update", { skipLocked: true });
      
      if (availableTickets.length < ticketCount) throw new Error("No hay suficientes tickets disponibles para apartar.");
      
      const ticketIdsToReserve = availableTickets.map(t => t.id);
      const reservationTime = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
      await tx.update(tickets).set({ status: 'reserved', reservedUntil: reservationTime }).where(inArray(tickets.id, ticketIdsToReserve));
      
      return { reservedTickets: availableTickets.map(t => t.ticketNumber), reservedUntil: reservationTime.toISOString() };
    });
    return { success: true, message: `${ticketCount} tickets apartados por ${RESERVATION_MINUTES} minutos.`, data: reservedData };
  } catch (error: any) {
    console.error("Error al apartar tickets:", error);
    return { success: false, message: error.message || "Ocurrió un error en el servidor." };
  }
}

const BuyTicketsSchema = z.object({
  name: z.string().min(3, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(10, "Teléfono inválido"),
  raffleId: z.string(),
  paymentReference: z.string().min(1, "La referencia es requerida"),
  paymentMethod: z.string().min(1, "Debe seleccionar un método de pago"),
  paymentScreenshot: z.instanceof(File).optional().nullable(),
  reservedTickets: z.string().min(1, "No hay tickets apartados para comprar."),
  // Campo opcional para el código de referido.
  referralCode: z.string().optional(),
});


export async function buyTicketsAction(formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData.entries());
  const paymentScreenshotFile = formData.get('paymentScreenshot') as File | null;

  if (!PABILO_API_URL || !PABILO_API_KEY) {
    console.error("Error: Las variables de entorno PABILO_API_URL o PABILO_API_KEY no están configuradas.");
    return { success: false, message: "Error de configuración del servidor. Contacte al administrador." };
  }
  
  // 2. Validar los datos del formulario con el schema actualizado.
  const validatedFields = BuyTicketsSchema.safeParse({
    ...data,
    paymentScreenshot: paymentScreenshotFile
  });

  if (!validatedFields.success) {
    console.error("Error de Validación:", validatedFields.error.flatten().fieldErrors);
    return { success: false, message: "Los datos proporcionados son inválidos. Por favor, revisa el formulario." };
  }
  
  // Destructuramos todos los campos, incluyendo referralCode.
  const { name, email, phone, raffleId, paymentReference, paymentMethod, reservedTickets, referralCode } = validatedFields.data;
  const ticketNumbers = reservedTickets.split(',');
  let paymentScreenshotUrl = '';

  // 3. Subir el comprobante de pago a S3 (si existe).
  // Se usa la condición mejorada que verifica el tamaño del archivo.
  if (validatedFields.data.paymentScreenshot && validatedFields.data.paymentScreenshot.size > 0) {
    try {
      const buffer = Buffer.from(await validatedFields.data.paymentScreenshot.arrayBuffer());
      const key = `purchases/${crypto.randomUUID()}-${validatedFields.data.paymentScreenshot.name}`;
      paymentScreenshotUrl = await uploadToS3(buffer, key, validatedFields.data.paymentScreenshot.type);
    } catch (error) {
      console.error("Error al subir captura de pantalla:", error);
      return { success: false, message: "Error al subir la imagen del pago." };
    }
  }

  try {
    const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
    if (!raffle) {
        return { success: false, message: "La rifa seleccionada no existe." };
    }
    
    // 4. Lógica para encontrar el ID del referido a partir del código.
    let referralLinkId: string | null = null;
    if (referralCode) {
        const link = await db.query.referralLinks.findFirst({
            where: eq(referralLinks.code, referralCode),
        });
        if (link) {
            referralLinkId = link.id;
        } else {
            console.warn(`Código de referido "${referralCode}" no fue encontrado.`);
        }
    }

    const amount = ticketNumbers.length * parseFloat(raffle.price);
    let purchaseStatus: "pending" | "confirmed" = "pending";
    // Mensaje de respuesta por defecto mejorado.
    let responseMessage = "¡Solicitud recibida! Te avisaremos por correo y WhatsApp cuando validemos el pago. ¡Mucha suerte!";

    // 5. Lógica de verificación de pago con Pabilo (del código original).
    const selectedPaymentMethod = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.title, paymentMethod) });

    if (selectedPaymentMethod && selectedPaymentMethod.triggersApiVerification) {
      const referenceToSend = paymentReference.slice(-4);
      const amountToSend = Math.round(amount);
      console.log(`🔵 Intentando verificar con Pabilo para [${paymentMethod}]...`);
      console.log({ amount: amountToSend, bank_reference: referenceToSend });

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 65000); // Timeout de 65 segundos

        const pabiloResponse = await fetch(PABILO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'appKey': PABILO_API_KEY,
          },
          body: JSON.stringify({
            amount: amountToSend,
            bank_reference: referenceToSend,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const pabiloData = await pabiloResponse.json();
        if (pabiloResponse.ok && pabiloData.data?.user_bank_payment?.status === 'paid') {
          console.info("✅ Pabilo CONFIRMÓ el pago exitosamente. La compra será automática.");
          purchaseStatus = "confirmed";
          responseMessage = "¡Pago confirmado automáticamente! Tus tickets ya han sido generados.";
        } else {
          console.error("⚠️ Pabilo NO encontró el pago. Pasando a verificación manual.");
        }
      } catch (apiError: any) {
        if (apiError.name === 'AbortError') {
          console.error("⛔ La API de Pabilo tardó demasiado en responder (timeout). Pasando a verificación manual.");
        } else {
          console.error("⛔ Error de conexión con la API de Pabilo.", apiError);
        }
      }
    }

    // 6. Ejecutar la transacción en la base de datos.
    const newPurchase = await db.transaction(async (tx) => {
      const ticketsToUpdate = await tx.select({ id: tickets.id }).from(tickets).where(and(eq(tickets.raffleId, raffleId), inArray(tickets.ticketNumber, ticketNumbers), eq(tickets.status, 'reserved')));
      if (ticketsToUpdate.length !== ticketNumbers.length) {
          throw new Error("Tu reservación expiró o los tickets ya no son válidos. Por favor, intenta de nuevo.");
      }

      // Se añade referralLinkId al objeto a insertar.
      const [createdPurchase] = await tx.insert(purchases).values({
        raffleId, buyerName: name, buyerEmail: email, buyerPhone: phone, ticketCount: ticketNumbers.length,
        amount: amount.toString(), paymentMethod, paymentReference, paymentScreenshotUrl, status: purchaseStatus,
        referralLinkId: referralLinkId, // Guardar el ID del referido.
      }).returning({ id: purchases.id });

      await tx.update(tickets).set({
        status: purchaseStatus === 'confirmed' ? 'sold' : 'reserved',
        purchaseId: createdPurchase.id,
        reservedUntil: null,
      }).where(inArray(tickets.id, ticketsToUpdate.map(t => t.id)));

      return createdPurchase;
    });

    // 7. Revalidar caché y enviar notificaciones.
    revalidatePath(`/rifa/${raffle.slug}`); // Usando la ruta mejorada con slug.
    revalidatePath("/admin/rifas");

    if (purchaseStatus === 'confirmed') {
        await sendTicketsEmailAndWhatsapp(newPurchase.id);
        // ▼▼▼ LÓGICA AUTOMÁTICA DE TICKET PREMIUM (CASO 1: PAGO AUTOMÁTICO) ▼▼▼
        await checkAndNotifyMagicTicketWinner(newPurchase.id);
    } else {
        await sendConfirmationEmail(newPurchase.id);
        await sendConfirmationWhatsapp(newPurchase.id);
    }

    return { success: true, message: responseMessage, data: newPurchase };

  } catch (error: any) {
    console.error("Error al procesar la compra de tickets:", error);
    return { success: false, message: error.message || "Ocurrió un error inesperado en el servidor." };
  }
}


const UpdatePurchaseStatusSchema = z.object({
  purchaseId: z.string(),
  newStatus: z.enum(purchaseStatusEnum.enumValues),
  // Campos opcionales para el rechazo
  rejectionReason: z.enum(rejectionReasonEnum.enumValues).optional(),
  rejectionComment: z.string().optional(),
});

export async function updatePurchaseStatusAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  // --- SEGURIDAD: Solo los administradores pueden cambiar el estado de una compra ---
  try {
    await requireAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const validatedFields = UpdatePurchaseStatusSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success)
    return { success: false, message: "Datos inválidos." };
  
  // Extrae los nuevos campos
  const { purchaseId, newStatus, rejectionReason, rejectionComment } = validatedFields.data;

  // Validación extra: si se rechaza, debe haber un motivo
  if (newStatus === 'rejected' && !rejectionReason) {
    return { success: false, message: "Debe seleccionar un motivo para el rechazo." };
  }

  try {
    const purchase = await db.query.purchases.findFirst({
        where: eq(purchases.id, purchaseId),
    });

    if (!purchase) {
        throw new Error("Compra no encontrada.");
    }
    if (purchase.status !== "pending") {
        return { success: false, message: "Esta compra ya ha sido procesada."};
    }

    await db.transaction(async (tx) => {
      // Modifica la actualización para incluir los nuevos campos
      await tx.update(purchases).set({ 
        status: newStatus,
        // Guarda los datos del rechazo si el estado es 'rejected'
        ...(newStatus === 'rejected' && {
            rejectionReason: rejectionReason,
            rejectionComment: rejectionComment
        })
      }).where(eq(purchases.id, purchaseId));
      
      if (newStatus === "confirmed") {
        await tx.update(tickets).set({ status: "sold" }).where(eq(tickets.purchaseId, purchaseId));
        await sendTicketsEmailAndWhatsapp(purchaseId);

        // ▼▼▼ LÓGICA AUTOMÁTICA DE TICKET PREMIUM (CASO 2: APROBACIÓN MANUAL) ▼▼▼
        await checkAndNotifyMagicTicketWinner(purchaseId);

      } else if (newStatus === "rejected") {
        await tx.update(tickets).set({ status: "available", purchaseId: null, reservedUntil: null }).where(eq(tickets.purchaseId, purchaseId));
        // Llama a la nueva función de notificación de rechazo
        if (rejectionReason) { // Asegura que rejectionReason no sea undefined
            await sendRejectionNotification(purchaseId, rejectionReason, rejectionComment);
        }
      }
    });

    // ✅ INICIO DE MODIFICACIÓN: Llamar a la lógica del Top 5 después de la transacción
    if (newStatus === "confirmed") {
        try {
            // Se llama a la función de notificación con el ID de la rifa y de la compra
            await handleTop5Notifications(purchase.raffleId, purchaseId);
        } catch (error) {
            console.error("Error al ejecutar las notificaciones del Top 5 (aprobación manual):", error);
        }
    }
    // ✅ FIN DE MODIFICACIÓN

    revalidatePath("/dashboard");
    revalidatePath("/mis-tickets");
    revalidatePath(`/rifas`);
    revalidatePath("/top-compradores"); // Revalidamos la página del top para reflejar cambios

    return {
      success: true,
      message: `La compra ha sido ${newStatus === "confirmed" ? "confirmada y notificada" : "rechazada y notificada"}.`,
    };
  } catch (error: any) {
    console.error("Error al actualizar compra:", error);
    return {
      success: false,
      message: error.message || "Ocurrió un error en el servidor.",
    };
  }
}

export async function findMyTicketsAction(formData: FormData): Promise<ActionState> {
  const validatedFields = z.object({ email: z.string().email("Debes ingresar un email válido.") }).safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { success: false, message: "Email inválido." };
  const { email } = validatedFields.data;
  try {
    const userPurchases = await db.query.purchases.findMany({
      where: eq(purchases.buyerEmail, email),
      orderBy: desc(purchases.createdAt),
      with: { raffle: { with: { images: { limit: 1 }, winnerTicket: { with: { purchase: true } } } }, tickets: { columns: { id: true, ticketNumber: true } } },
    });
    return { success: true, message: "Datos encontrados.", data: userPurchases };
  } catch (error) {
    console.error("Error al buscar tickets:", error);
    return { success: false, message: "Ocurrió un error en el servidor." };
  }
}

// ----------------------------------------------------------------
// ACTIONS PARA GESTIÓN DE RIFAS (ADMIN)
// ----------------------------------------------------------------

const CreateRaffleSchema = z.object({
  name: z.string().min(5, "El nombre debe tener al menos 5 caracteres."),
  description: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser un número positivo."),
  minimumTickets: z.coerce.number().int().positive("El mínimo de tickets debe ser un número positivo."),
  limitDate: z.string().min(1, "La fecha límite es requerida."),
  currency: z.enum(currencyEnum.enumValues, {
    required_error: "La moneda es requerida.",
  }),
});

export async function createRaffleAction(formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData.entries());
  const images = formData.getAll("images") as File[];
  const validatedFields = CreateRaffleSchema.safeParse(data);

  if (!validatedFields.success) {
      const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
      return { success: false, message: firstError || "Error de validación en los campos." };
  }
  
  const { name, description, price, minimumTickets, limitDate, currency } = validatedFields.data;

  for (const file of images) {
    if (file.size > 5 * 1024 * 1024) return { success: false, message: `El archivo ${file.name} es demasiado grande.` };
    if (!file.type.startsWith("image/")) return { success: false, message: `El archivo ${file.name} no es una imagen.` };
  }

  try {
    // 👇 NUEVA LÓGICA: Generar y asegurar un slug único
    let baseSlug = slugify(name);
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await db.query.raffles.findFirst({ where: eq(raffles.slug, uniqueSlug) })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const newRaffle = await db.transaction(async (tx) => {
      const [createdRaffle] = await tx.insert(raffles).values({
        name, 
        description, 
        price: price.toString(), 
        minimumTickets, 
        status: "draft", 
        limitDate: new Date(limitDate),
        currency,
        slug: uniqueSlug, // <-- Guardamos el slug único
      }).returning({ id: raffles.id });

      const imageUrls = await Promise.all(images.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        const key = `raffles/${createdRaffle.id}/${crypto.randomUUID()}-${file.name}`;
        const url = await uploadToS3(buffer, key, file.type);
        return { url, raffleId: createdRaffle.id };
      }));

      if (imageUrls.length > 0) await tx.insert(raffleImages).values(imageUrls);
      return createdRaffle;
    });

    revalidatePath("/rifas");
    
    try {
      await notifyWaitlistAboutNewRaffle(newRaffle.id, name, price.toString(), currency);
    } catch (notificationError) {
      console.error("La rifa se creó, pero falló el envío de notificaciones a la lista de espera.", notificationError);
    }
    
    return { success: true, message: "Rifa creada con éxito.", data: newRaffle };
  } catch (error) {
    console.error("Error al crear la rifa:", error);
    return { success: false, message: "Ocurrió un error al crear la rifa." };
  }
}

const UpdateRaffleStatusSchema = z.object({
  raffleId: z.string(),
  status: z.enum(raffleStatusEnum.enumValues),
});

export async function updateRaffleStatusAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = UpdateRaffleStatusSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { success: false, message: "Datos inválidos." };
  const { raffleId, status } = validatedFields.data;
  try {
    await db.transaction(async (tx) => {
      // Get the current raffle to check its status
      const currentRaffle = await tx.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
      if (!currentRaffle) throw new Error("Rifa no encontrada.");

      // Update the raffle status
      await tx.update(raffles).set({ status, updatedAt: new Date() }).where(eq(raffles.id, raffleId));

      // If activating a draft raffle, generate tickets
      if (currentRaffle.status === 'draft' && status === 'active') {
        const ticketsToGenerate = [];
        
        // Generate tickets from 0000 to 9999 (10,000 tickets)
        for (let i = 0; i < 10000; i++) {
          const ticketNumber = i.toString().padStart(4, '0');
          ticketsToGenerate.push({
            ticketNumber,
            raffleId,
            status: 'available' as const,
          });
        }

        // Insert tickets in batches to avoid memory issues
        const batchSize = 1000;
        for (let i = 0; i < ticketsToGenerate.length; i += batchSize) {
          const batch = ticketsToGenerate.slice(i, i + batchSize);
          await tx.insert(tickets).values(batch);
        }
      }
    });

    revalidatePath("/rifas");
    revalidatePath(`/rifas/${raffleId}`);
    return { success: true, message: "Estado de la rifa actualizado." };
  } catch (error) {
    console.error("Error al actualizar rifa:", error);
    return { success: false, message: "Ocurrió un error en el servidor." };
  }
}

const UpdateRaffleSchema = z.object({
  raffleId: z.string(),
  name: z.string().min(5, "El nombre debe tener al menos 5 caracteres."),
  description: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser un número positivo."),
  minimumTickets: z.coerce.number().int().positive("El mínimo de tickets debe ser positivo."),
  limitDate: z.string().min(1, "La fecha límite es requerida."),
  currency: z.enum(["USD", "VES"], {
    required_error: "La moneda es requerida.",
  }),
});

export async function updateRaffleAction(formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData.entries());
  const newImages = formData.getAll("images") as File[];
  const imagesToDeleteString = formData.get('imagesToDelete') as string | null;
  const validatedFields = UpdateRaffleSchema.safeParse(data);
  
  if (!validatedFields.success) {
    return { success: false, message: "Error de validación en los campos." };
  }
  
  const { raffleId, name, description, price, minimumTickets, limitDate, currency } = validatedFields.data;
  const imageIdsToDelete = imagesToDeleteString?.split(',').filter(id => id.trim() !== '') || [];

  try {
    await db.transaction(async (tx) => {
      await tx.update(raffles).set({ 
        name, 
        description, 
        price: price.toString(), 
        minimumTickets, 
        limitDate: new Date(limitDate), 
        updatedAt: new Date(),
        currency,
      }).where(eq(raffles.id, raffleId));

      if (imageIdsToDelete.length > 0) {
        const images = await tx.query.raffleImages.findMany({ where: inArray(raffleImages.id, imageIdsToDelete) });
        for (const image of images) {
          const key = image.url.substring(image.url.indexOf('raffles/'));
          await deleteFromS3(key);
        }
        await tx.delete(raffleImages).where(inArray(raffleImages.id, imageIdsToDelete));
      }

      if (newImages.length > 0) {
        const imageUrls = await Promise.all(newImages.map(async (file) => {
          const buffer = Buffer.from(await file.arrayBuffer());
          const key = `raffles/${raffleId}/${crypto.randomUUID()}-${file.name}`;
          const url = await uploadToS3(buffer, key, file.type);
          return { url, raffleId: raffleId };
        }));
        if (imageUrls.length > 0) await tx.insert(raffleImages).values(imageUrls);
      }
    });

    revalidatePath("/rifas");
    revalidatePath(`/rifas/${raffleId}`);
    return { success: true, message: "Rifa actualizada con éxito." };
  } catch (error) {
    console.error("Error al actualizar la rifa:", error);
    return { success: false, message: "Ocurrió un error en el servidor." };
  }
}

const DrawWinnerSchema = z.object({
  raffleId: z.string(),
  lotteryNumber: z.string().min(4, "El número debe tener 4 dígitos.").max(4, "El número debe tener 4 dígitos."),
  winnerProof: z.instanceof(File, { message: "La captura de la lotería es requerida." })
    .refine((file) => file.size > 0, "La captura no puede estar vacía.")
    .refine((file) => file.size < 5 * 1024 * 1024, "La imagen no debe pesar más de 5MB.")
    .refine((file) => file.type.startsWith("image/"), "El archivo debe ser una imagen."),
});

export async function drawWinnerAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData.entries());
  const winnerProofFile = formData.get('winnerProof') as File | null;
  const validatedFields = DrawWinnerSchema.safeParse({ ...data, winnerProof: winnerProofFile });

  if (!validatedFields.success) {
    return { success: false, message: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors) };
  }

  const { raffleId, lotteryNumber, winnerProof } = validatedFields.data;

  try {
    const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
    if (!raffle || raffle.status !== 'finished') {
      return { success: false, message: "La rifa no está en estado finalizado." };
    }

    const winningTicket = await db.query.tickets.findFirst({
      where: and(
        eq(tickets.raffleId, raffleId), 
        eq(tickets.ticketNumber, lotteryNumber),
        eq(tickets.status, 'sold')
      ),
      with: { purchase: true }
    });

    if (!winningTicket || !winningTicket.purchase) {
      return { success: false, message: `El ticket #${lotteryNumber} no fue vendido o no existe. La rifa puede ser pospuesta.` };
    }

    const buffer = Buffer.from(await winnerProof.arrayBuffer());
    const key = `winners/${raffleId}/${crypto.randomUUID()}-${winnerProof.name}`;
    const winnerProofUrl = await uploadToS3(buffer, key, winnerProof.type);

    await db.update(raffles).set({
      winnerTicketId: winningTicket.id,
      winnerLotteryNumber: lotteryNumber,
      winnerProofUrl,
    }).where(eq(raffles.id, raffleId));

    // ✅ --- INICIO DE CAMBIOS: LLAMAR A LA FUNCIÓN DE NOTIFICACIÓN ---
    await sendWinnerNotification(raffleId, winningTicket.id);
    // --- FIN DE CAMBIOS ---

    revalidatePath("/rifas");
    revalidatePath(`/rifas/${raffleId}`);

    return {
      success: true,
      message: "¡Ganador registrado y notificado con éxito!",
      data: {
        winnerTicketNumber: winningTicket.ticketNumber,
        winnerName: winningTicket.purchase.buyerName,
        winnerEmail: winningTicket.purchase.buyerEmail,
        winnerProofUrl,
      },
    };
  } catch (error: any) {
    console.error("Error al registrar ganador:", error);
    return { success: false, message: error.message || "Ocurrió un error en el servidor." };
  }
}

const PostponeRaffleSchema = z.object({
  raffleId: z.string(),
  newLimitDate: z.string().min(1, "La nueva fecha límite es requerida."),
});

export async function postponeRaffleAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = PostponeRaffleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { success: false, message: "Datos inválidos." };
  const { raffleId, newLimitDate } = validatedFields.data;
  try {
    const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
    // La rifa debe estar en 'finished' para poder posponerse
    if (!raffle || raffle.status !== 'finished') return { success: false, message: "La rifa no puede ser pospuesta en su estado actual." };

    // --- MEJORA DE LÓGICA AQUÍ ---
    // En lugar de 'postponed', la cambiamos a 'active' con la nueva fecha.
    // Esto la "reactiva" para el futuro sorteo.
    await db.update(raffles).set({
      status: 'active',
      limitDate: new Date(newLimitDate)
    }).where(eq(raffles.id, raffleId));

    revalidatePath(`/rifas/${raffleId}`);
    revalidatePath("/rifas");
    return { success: true, message: "Rifa pospuesta con éxito. Se ha reactivado con la nueva fecha." };
  } catch (error: any) {
    console.error("Error al posponer rifa:", error);
    return { success: false, message: error.message || "Ocurrió un error en el servidor." };
  }
}

// --- NUEVA FUNCIÓN PARA GENERAR TICKETS EN RIFAS EXISTENTES ---
export async function generateTicketsForRaffle(raffleId: string): Promise<ActionState> {
  try {
    const result = await db.transaction(async (tx) => {
      // Check if raffle exists and is active
      const raffle = await tx.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
      if (!raffle) {
        throw new Error("Rifa no encontrada.");
      }
      if (raffle.status !== 'active') {
        throw new Error("Solo se pueden generar tickets para rifas activas.");
      }

      // Check if tickets already exist
      const existingTickets = await tx.query.tickets.findMany({ 
        where: eq(tickets.raffleId, raffleId),
        limit: 1 
      });
      
      if (existingTickets.length > 0) {
        throw new Error("Esta rifa ya tiene tickets generados.");
      }

      // Generate tickets from 0000 to 9999 (10,000 tickets)
      const ticketsToGenerate = [];
      for (let i = 0; i < 10000; i++) {
        const ticketNumber = i.toString().padStart(4, '0');
        ticketsToGenerate.push({
          ticketNumber,
          raffleId,
          status: 'available' as const,
        });
      }

      // Insert tickets in batches
      const batchSize = 1000;
      for (let i = 0; i < ticketsToGenerate.length; i += batchSize) {
        const batch = ticketsToGenerate.slice(i, i + batchSize);
        await tx.insert(tickets).values(batch);
      }

      return { ticketsGenerated: ticketsToGenerate.length };
    });

    revalidatePath("/rifas");
    revalidatePath(`/rifas/${raffleId}`);
    return { 
      success: true, 
      message: `Se generaron ${result.ticketsGenerated} tickets exitosamente.`, 
      data: result 
    };
  } catch (error: any) {
    console.error("Error al generar tickets:", error);
    return { success: false, message: error.message || "Ocurrió un error en el servidor." };
  }
}

const PaymentMethodSchema = z.object({
  title: z.string().min(3, "El título es requerido."),
  icon: z.instanceof(File).optional(),
  accountHolderName: z.string().optional().nullable(),
  rif: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  accountNumber: z.string().optional().nullable(),
  email: z.string().email("Debe ser un correo válido.").optional().nullable().or(z.literal("")),
  walletAddress: z.string().optional().nullable(),
  network: z.string().optional().nullable(),
  // +++ NEW: binancePayId field +++
  binancePayId: z.string().optional().nullable(),
  isActive: z.preprocess((val) => val === 'on' || val === true || val === 'true', z.boolean()),
  triggersApiVerification: z.preprocess((val) => val === 'on' || val === true || val === 'true', z.boolean()),
});

export async function createPaymentMethodAction(prevState: any, formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData.entries());
  const iconFile = formData.get('icon') as File | null;
  const validatedFields = PaymentMethodSchema.safeParse({ ...data, icon: iconFile });
  
  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, message: firstError || "Datos inválidos." };
  }
  
  const { 
    icon, 
    title, 
    accountHolderName, 
    rif, 
    phoneNumber, 
    bankName, 
    accountNumber, 
    email, 
    walletAddress, 
    network, 
    binancePayId, // +++ NEW: Extract binancePayId +++
    isActive, 
    triggersApiVerification 
  } = validatedFields.data;

  let iconUrl: string | undefined = undefined;

  try {
    if (icon && icon.size > 0) {
      const buffer = Buffer.from(await icon.arrayBuffer());
      const key = `payment-methods/${crypto.randomUUID()}-${icon.name}`;
      iconUrl = await uploadToS3(buffer, key, icon.type);
    }

    await db.insert(paymentMethods).values({ 
      title, 
      iconUrl, 
      accountHolderName, 
      rif, 
      phoneNumber, 
      bankName, 
      accountNumber, 
      email, 
      walletAddress, 
      network, 
      binancePayId, // +++ NEW: Add to values +++
      isActive, 
      triggersApiVerification 
    });
    
    revalidatePath("/admin/metodos-pago");
    return { success: true, message: "Método de pago creado con éxito." };
  } catch (error) {
    console.error("Error al crear el método de pago:", error);
    return { success: false, message: "Error al crear el método de pago. El título podría estar duplicado." };
  }
}

export async function updatePaymentMethodAction(prevState: any, formData: FormData): Promise<ActionState> {
  const id = formData.get('id') as string;
  if (!id) return { success: false, message: "ID del método no encontrado." };
  
  const data = Object.fromEntries(formData.entries());
  const iconFile = formData.get('icon') as File | null;
  
  const validatedFields = PaymentMethodSchema.safeParse({ ...data, icon: iconFile });
  if (!validatedFields.success) {
    const firstError = Object.values(validatedFields.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, message: firstError || "Datos inválidos." };
  }

  const { 
    icon, 
    title, 
    accountHolderName, 
    rif, 
    phoneNumber, 
    bankName, 
    accountNumber, 
    email, 
    walletAddress, 
    network, 
    binancePayId, // +++ NEW: Extract binancePayId +++
    isActive, 
    triggersApiVerification 
  } = validatedFields.data;

  let iconUrl: string | undefined = undefined;

  try {
    if (icon && icon.size > 0) {
      const oldMethod = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.id, id) });
      if (oldMethod?.iconUrl) {
        const oldKey = oldMethod.iconUrl.substring(oldMethod.iconUrl.indexOf('payment-methods/'));
        await deleteFromS3(oldKey);
      }
      
      const buffer = Buffer.from(await icon.arrayBuffer());
      const key = `payment-methods/${crypto.randomUUID()}-${icon.name}`;
      iconUrl = await uploadToS3(buffer, key, icon.type);
    }
    
    await db.update(paymentMethods).set({ 
      title, 
      accountHolderName, 
      rif, 
      phoneNumber, 
      bankName, 
      accountNumber, 
      email, 
      walletAddress, 
      network, 
      binancePayId, // +++ NEW: Add to set object +++
      isActive, 
      triggersApiVerification,
      ...(iconUrl && { iconUrl })
    }).where(eq(paymentMethods.id, id));
    
    revalidatePath("/admin/metodos-pago");
    revalidatePath("/rifa"); 
    return { success: true, message: "Método de pago actualizado." };
  } catch (error) {
    console.error("Error al actualizar método de pago:", error);
    return { success: false, message: "Error al actualizar." };
  }
}

export async function deletePaymentMethodAction(prevState: any, formData: FormData): Promise<ActionState> {
  const id = formData.get('id') as string;
  try {
    // --- LÓGICA PARA BORRAR IMAGEN DE S3 AL ELIMINAR ---
    const methodToDelete = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.id, id) });
    if (methodToDelete?.iconUrl) {
        const key = methodToDelete.iconUrl.substring(methodToDelete.iconUrl.indexOf('payment-methods/'));
        await deleteFromS3(key);
    }
    
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
    revalidatePath("/admin/metodos-pago");
    return { success: true, message: "Método de pago eliminado." };
  } catch (error) {
    return { success: false, message: "Error al eliminar." };
  }
}

const DeleteUserSchema = z.object({
  id: z.string().min(1, "ID de usuario requerido"),
});

export async function deleteUserAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = DeleteUserSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { success: false, message: "ID de usuario inválido." };
  }

  const { id } = validatedFields.data;

  try {
    const deletedUser = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id });

    if (deletedUser.length === 0) {
      return { success: false, message: "No se encontró el usuario a eliminar." };
    }

    revalidatePath("/usuarios"); // Revalida la ruta del panel de usuarios
    return { success: true, message: "Usuario eliminado con éxito." };

  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
    // Maneja el caso en que el usuario no se puede borrar por tener datos asociados
    if (error.code === '23503') {
        return { success: false, message: "No se puede eliminar el usuario porque tiene registros asociados." };
    }
    return { success: false, message: "Error del servidor al intentar eliminar el usuario." };
  }
}

// ----------------------------------------------------------------
// ACTIONS PARA LA LISTA DE ESPERA (WAITLIST)
// ----------------------------------------------------------------

const WaitlistSchema = z.object({
  name: z.string().min(3, "El nombre es requerido."),
  email: z.string().email("El correo electrónico no es válido."),
  whatsapp: z.string().min(10, "El número de WhatsApp no es válido."),
});

/**
 * Acción para registrar un nuevo usuario en la lista de espera.
 */
export async function addToWaitlistAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = WaitlistSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return { success: false, message: "Datos inválidos. Por favor, revisa el formulario." };
  }

  const { name, email, whatsapp } = validatedFields.data;

  try {
    await db.insert(waitlistSubscribers).values({
      name,
      email,
      whatsapp,
    });

    return { success: true, message: "¡Gracias por unirte! Te notificaremos de las próximas rifas." };
  } catch (error: any) {
    // Error de restricción única (código 23505 en PostgreSQL)
    if (error.code === '23505') {
      return { success: false, message: "Este correo o número de WhatsApp ya está registrado." };
    }
    console.error("Error al registrar en la lista de espera:", error);
    return { success: false, message: "Ocurrió un error en el servidor. Inténtalo de nuevo." };
  }
}


/**
 * Notifica a todos los suscriptores de la lista de espera sobre una nueva rifa.
 * @param raffleId El ID de la nueva rifa.
 * @param raffleName El nombre de la nueva rifa.
 * @param rafflePrice El precio del ticket de la nueva rifa.
 */
async function notifyWaitlistAboutNewRaffle(raffleId: string, raffleName: string, rafflePrice: string, raffleCurrency: 'USD' | 'VES') {
  console.log(`Iniciando notificación a la lista de espera para la rifa: ${raffleName}`);
  
  try {
    const subscribers = await db.query.waitlistSubscribers.findMany();

    if (subscribers.length === 0) {
      console.log("No hay suscriptores en la lista de espera para notificar.");
      return;
    }

    const priceFormatted = raffleCurrency === 'USD' ? `$${rafflePrice}` : `Bs. ${rafflePrice}`;
    const raffleUrl = `https://llevateloconjorvi.com/rifa/${raffleId}`; // <-- CAMBIA ESTO por tu dominio real

    for (const subscriber of subscribers) {
      // --- Preparar mensaje de Email ---
      const emailSubject = `🎉 ¡Nueva Rifa Disponible: ${raffleName}!`;
      const emailBody = `
        <h1>¡Hola ${subscriber.name}!</h1>
        <p>¡Tenemos una nueva y emocionante rifa para ti!</p>
        <p><strong>${raffleName}</strong> ya está activa y puedes participar por tan solo <strong>${priceFormatted}</strong> por ticket.</p>
        <p>No te pierdas la oportunidad de ganar. ¡Haz clic en el botón de abajo para participar ahora!</p>
        <a href="${raffleUrl}" style="background-color: #f59e0b; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Participar en la Rifa
        </a>
        <p>¡Mucha suerte!</p>
        <p>El equipo de Jorvilaniña.</p>
      `;

      // --- Preparar mensaje de WhatsApp ---
      const whatsappText = `¡Hola ${subscriber.name}! 👋\n\n🎉 ¡Ya está disponible nuestra nueva rifa: *${raffleName}*!\n\nPuedes ganar un premio increíble por solo *${priceFormatted}*.\n\n¡No te quedes fuera! Participa ahora mismo entrando a este enlace:\n${raffleUrl}\n\n¡Mucha suerte! 🍀`;

      // --- Enviar notificaciones (con manejo de errores individual) ---
      try {
        await sendEmail({ to: subscriber.email, subject: emailSubject, body: emailBody });
      } catch (e) {
        console.error(`Error enviando email a ${subscriber.email}:`, e);
      }
      
      try {
        await sendWhatsappMessage(subscriber.whatsapp, whatsappText);
      } catch (e) {
        console.error(`Error enviando WhatsApp a ${subscriber.whatsapp}:`, e);
      }
    }
    console.log(`Notificaciones enviadas a ${subscribers.length} suscriptores.`);
  } catch (error) {
    console.error("Error masivo al notificar a la lista de espera:", error);
  }
}

const ReferralLinkSchema = z.object({
    name: z.string().min(3, "El nombre de la campaña es requerido."),
    code: z.string().min(3, "El código es requerido.").regex(/^[a-zA-Z0-9_-]+$/, "El código solo puede contener letras, números, guiones y guiones bajos."),
});

export async function createReferralLinkAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
    await requireAdmin();
    const validatedFields = ReferralLinkSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        return { success: false, message: "Datos inválidos." };
    }

    const { name, code } = validatedFields.data;

    try {
        const existingCode = await db.query.referralLinks.findFirst({ where: eq(referralLinks.code, code) });
        if (existingCode) {
            return { success: false, message: "Este código ya está en uso. Elige otro." };
        }

        await db.insert(referralLinks).values({ name, code });
        revalidatePath("/admin/referidos");
        return { success: true, message: "Link de referido creado con éxito." };
    } catch (error) {
        console.error("Error al crear link de referido:", error);
        return { success: false, message: "Error del servidor." };
    }
}

// ✅ AÑADIDO: Un tipo más explícito para nuestras analíticas
type SellerAnalytics = {
    sellerName: string;
    // ✅ AÑADIDO: 'type' para diferenciar en el frontend
    type: 'personal' | 'link' | 'direct'; 
    totalSales: number;
    confirmedSales: number;
    totalTickets: number;
    confirmedTickets: number;
    totalRevenue: number;
    confirmedRevenue: number;
};


export async function getReferralAnalyticsForRaffle(raffleId: string) {
    await requireAdmin();
    try {
        const raffle = await db.query.raffles.findFirst({
            where: eq(raffles.id, raffleId),
            columns: { id: true, name: true, price: true, currency: true }
        });

        if (!raffle) {
            return { success: false, message: "Rifa no encontrada." };
        }

        // ✅ CAMBIO: Hacemos join con 'referral' (vendedores) y 'referralLink' (campañas)
        const sales = await db.query.purchases.findMany({
            where: eq(purchases.raffleId, raffleId),
            columns: { status: true, ticketCount: true, amount: true },
            with: {
                referralLink: { // Para links de campaña (ej. Meta)
                    columns: { id: true, name: true }
                },
                referral: { // Para vendedores personales con cuenta
                    columns: { id: true, name: true }
                }
            }
        });
        
        // Usamos un Map para agrupar los datos eficientemente
        const analyticsMap = new Map<string, SellerAnalytics>();

        // Procesamos cada venta para asignarla al grupo correcto
        for (const sale of sales) {
            let key: string;
            let name: string;
            let type: 'personal' | 'link' | 'direct';

            // ✅ LÓGICA DE PRIORIDAD:
            // 1. Si existe un referido personal (referralId), se le da prioridad.
            if (sale.referral) {
                key = `personal-${sale.referral.id}`;
                name = sale.referral.name;
                type = 'personal';
            } 
            // 2. Si no, se busca un link de campaña (referralLinkId).
            else if (sale.referralLink) {
                key = `link-${sale.referralLink.id}`;
                name = sale.referralLink.name;
                type = 'link';
            } 
            // 3. Si no hay ninguno, es una venta directa.
            else {
                key = 'direct';
                name = 'Ventas Directas (Sin Referido)';
                type = 'direct';
            }

            // Si es la primera vez que vemos este referido/link/directo, inicializamos sus estadísticas.
            if (!analyticsMap.has(key)) {
                analyticsMap.set(key, {
                    sellerName: name,
                    type: type, // Guardamos el tipo para usarlo en el frontend
                    totalSales: 0, confirmedSales: 0, totalTickets: 0,
                    confirmedTickets: 0, totalRevenue: 0, confirmedRevenue: 0,
                });
            }

            const stats = analyticsMap.get(key)!;
            const saleAmount = parseFloat(sale.amount);

            // Acumulamos las estadísticas totales
            stats.totalSales += 1;
            stats.totalTickets += sale.ticketCount;
            stats.totalRevenue += saleAmount;

            // Acumulamos las estadísticas solo si la venta está confirmada
            if (sale.status === 'confirmed') {
                stats.confirmedSales += 1;
                stats.confirmedTickets += sale.ticketCount;
                stats.confirmedRevenue += saleAmount;
            }
        }
        
        // Convertimos el Map a un array y lo ordenamos por ingresos confirmados
        const analytics = Array.from(analyticsMap.values())
                                .sort((a, b) => b.confirmedRevenue - a.confirmedRevenue);

        return { success: true, data: { raffle, analytics } };

    } catch (error) {
        console.error("Error obteniendo analíticas:", error);
        return { success: false, message: "Error del servidor." };
    }
}


export async function deleteReferralLinkAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
    await requireAdmin();
    const id = formData.get('id') as string;
    if (!id) return { success: false, message: "ID no proporcionado." };

    try {
        await db.delete(referralLinks).where(eq(referralLinks.id, id));
        revalidatePath("/admin/referidos");
        return { success: true, message: "Link de referido eliminado." };
    } catch (error) {
        console.error("Error al eliminar link de referido:", error);
        return { success: false, message: "Error del servidor. Es posible que el link tenga compras asociadas." };
    }
}

export async function getSalesDataForRaffle(raffleId: string): Promise<RaffleSalesData | null> {
    try {
        // 1. Obtener los detalles básicos de la rifa
        const raffleDetails = await db.query.raffles.findFirst({
            where: eq(raffles.id, raffleId),
            columns: { id: true, name: true, currency: true, price: true, minimumTickets: true }
        });

        if (!raffleDetails) return null;

        // 2. Obtener todas las compras de la rifa, incluyendo sus tickets y el referido asociado
        const allSales = await db.query.purchases.findMany({
            where: eq(purchases.raffleId, raffleId),
            orderBy: desc(purchases.createdAt),
            with: {
                tickets: { columns: { ticketNumber: true } },
                // --- RELACIÓN AÑADIDA A LA CONSULTA ---
                referralLink: {
                    columns: {
                        name: true // Solo necesitamos el nombre del referido
                    }
                },
            },
        });
        
        return {
            raffle: { ...raffleDetails, totalTickets: raffleDetails.minimumTickets },
            // Se hace un casting al tipo actualizado para que el componente cliente lo reconozca
            sales: allSales as unknown as PurchaseWithTicketsAndRaffle[],
        };

    } catch (error) {
        console.error("Error al obtener las ventas de la rifa:", error);
        return null;
    }
}

export async function getPaginatedSales(
  raffleId: string,
  options: {
    pageIndex: number;
    pageSize: number;
    sorting: SortingState;
    globalFilter: string;
    columnFilters: { id: string; value: unknown }[];
    dateFilter?: string;
  }
) {
  try {
    await requireAdmin();

    const { pageIndex, pageSize, sorting, globalFilter, columnFilters, dateFilter } = options;

    // --- 1. CONSTRUCCIÓN DE FILTROS (Sin cambios aquí) ---
    const conditions = [eq(purchases.raffleId, raffleId)];
    if (globalFilter) {
      conditions.push(or(like(purchases.buyerName, `%${globalFilter}%`), like(purchases.buyerEmail, `%${globalFilter}%`)));
    }
    columnFilters.forEach(filter => {
      const { id, value } = filter;
      if (id === 'status' && Array.isArray(value) && value.length > 0) {
        conditions.push(inArray(purchases.status, value as ('pending' | 'confirmed' | 'rejected')[]));
      }
      if (id === 'referral' && Array.isArray(value) && value.length > 0) {
        const hasDirect = value.includes('Directa');
        const referralNames = value.filter(v => v !== 'Directa');
        const referralConditions: any[] = [];
        if (hasDirect) {
          referralConditions.push(and(isNull(purchases.referralLinkId), isNull(purchases.referralId)));
        }
        if (referralNames.length > 0) {
          const referralLinkIdsQuery = db.select({ id: referralLinks.id }).from(referralLinks).where(inArray(referralLinks.name, referralNames));
          const referralIdsQuery = db.select({ id: referrals.id }).from(referrals).where(inArray(referrals.name, referralNames));
          referralConditions.push(or(inArray(purchases.referralLinkId, referralLinkIdsQuery), inArray(purchases.referralId, referralIdsQuery)));
        }
        if (referralConditions.length > 0) {
          conditions.push(or(...referralConditions));
        }
      }
    });
    if (dateFilter) {
      const startOfDay = new Date(`${dateFilter}T00:00:00.000-04:00`);
      const endOfDay = new Date(`${dateFilter}T23:59:59.999-04:00`);
      conditions.push(sql`${purchases.createdAt} >= ${startOfDay} AND ${purchases.createdAt} <= ${endOfDay}`);
    }

    const whereClause = and(...conditions);
    const orderBy = sorting.length > 0
      ? sorting.map(sort => sort.desc ? desc(purchases[sort.id as keyof typeof purchases.$inferSelect]) : asc(purchases[sort.id as keyof typeof purchases.$inferSelect]))
      : [desc(purchases.createdAt)];


    // --- 2. CONSULTAS PRINCIPALES PARA DATOS Y ESTADÍSTICAS (Sin cambios aquí) ---
    const [data, statsResult] = await Promise.all([
      db.query.purchases.findMany({
        where: whereClause,
        orderBy,
        limit: pageSize,
        offset: pageIndex * pageSize,
        with: {
          tickets: { columns: { ticketNumber: true } },
          referralLink: { columns: { name: true } },
          referral: { columns: { name: true } },
        },
      }),
      db.select({
        totalSales: sql<number>`count(*)`.mapWith(Number),
        totalRevenue: sql<number>`sum(case when ${purchases.status} = 'confirmed' then ${purchases.amount}::decimal else 0 end)`.mapWith(Number),
        totalTicketsSold: sql<number>`sum(case when ${purchases.status} = 'confirmed' then ${purchases.ticketCount} else 0 end)`.mapWith(Number),
        pendingRevenue: sql<number>`sum(case when ${purchases.status} = 'pending' then ${purchases.amount}::decimal else 0 end)`.mapWith(Number),
      }).from(purchases).where(whereClause),
    ]);

    const totalRowCount = statsResult[0]?.totalSales || 0;
    const pageCount = Math.ceil(totalRowCount / pageSize);
    
    // --- 3. LÓGICA CORREGIDA PARA BUSCAR Y ADJUNTAR DUPLICADOS ---
    // Si no hay resultados, devolvemos temprano.
    if (data.length === 0) {
      return {
        rows: [], pageCount, totalRowCount,
        statistics: {
          totalSales: totalRowCount,
          totalRevenue: statsResult[0]?.totalRevenue || 0,
          totalTicketsSold: statsResult[0]?.totalTicketsSold || 0,
          pendingRevenue: statsResult[0]?.pendingRevenue || 0,
        },
      };
    }

    // Usamos Promise.all para buscar duplicados para cada venta en paralelo.
    const enrichedRows = await Promise.all(
        data.map(async (sale) => {
            // Si no hay referencia o es muy corta, no buscamos duplicados.
            if (!sale.paymentReference || sale.paymentReference.length < 4) {
                return { ...sale, similarReferences: [] };
            }

            const lastFourDigits = sale.paymentReference.slice(-4);
            
            // Replicamos la lógica simple y efectiva de tu función `getSaleDetails`
            const similarResults = await db.query.purchases.findMany({
                where: and(
                    // Busca tanto coincidencias exactas como por los últimos 4 dígitos
                    or(
                        eq(purchases.paymentReference, sale.paymentReference),
                        like(purchases.paymentReference, `%${lastFourDigits}`)
                    ),
                    ne(purchases.id, sale.id) // Excluye la propia venta de los resultados
                ),
                orderBy: desc(purchases.createdAt),
                limit: 10 // Limitamos para evitar sobrecarga
            });

            return {
                ...sale,
                similarReferences: similarResults as Purchase[],
            };
        })
    );

    // --- 4. DEVOLVER LOS DATOS ENRIQUECIDOS ---
    return {
      rows: enrichedRows as unknown as PurchaseWithTicketsAndRaffle[],
      pageCount,
      totalRowCount,
      statistics: {
        totalSales: totalRowCount,
        totalRevenue: statsResult[0]?.totalRevenue || 0,
        totalTicketsSold: statsResult[0]?.totalTicketsSold || 0,
        pendingRevenue: statsResult[0]?.pendingRevenue || 0,
      },
    };

  } catch (error) {
    console.error("Error al obtener ventas paginadas:", error);
    return {
      rows: [],
      pageCount: 0,
      totalRowCount: 0,
      statistics: { totalSales: 0, totalRevenue: 0, totalTicketsSold: 0, pendingRevenue: 0 },
      error: "Error del servidor",
    };
  }
}

// ✨ ==========================================================
// ✨ FUNCIÓN MODIFICADA PARA OBTENER OPCIONES DE FILTRO DE REFERIDOS
// ✨ ==========================================================
export async function getReferralOptionsForRaffle(raffleId: string): Promise<string[]> {
    try {
        // ✨ 1. Consulta para obtener nombres de `referral_links`
        const referralLinkNamesQuery = db
            .selectDistinct({ name: referralLinks.name })
            .from(referralLinks)
            .innerJoin(purchases, eq(purchases.referralLinkId, referralLinks.id))
            .where(and(eq(purchases.raffleId, raffleId), isNotNull(referralLinks.name)));

        // ✨ 2. Consulta para obtener nombres de `referrals`
        const referralNamesQuery = db
            .selectDistinct({ name: referrals.name })
            .from(referrals)
            .innerJoin(purchases, eq(purchases.referralId, referrals.id))
            .where(and(eq(purchases.raffleId, raffleId), isNotNull(referrals.name)));

        // ✨ 3. Consulta para verificar si existen ventas directas
        const directSalesQuery = db
            .select({ id: purchases.id })
            .from(purchases)
            .where(and(
                eq(purchases.raffleId, raffleId),
                isNull(purchases.referralLinkId),
                isNull(purchases.referralId) // Ambas deben ser nulas para ser directa
            ))
            .limit(1);

        // Ejecutar todas las consultas en paralelo
        const [
            referralLinkNamesResult,
            referralNamesResult,
            directSalesResult
        ] = await Promise.all([
            referralLinkNamesQuery,
            referralNamesQuery,
            directSalesQuery,
        ]);
        
        // ✨ 4. Combinar y eliminar duplicados usando un Set
        const allNames = new Set<string>();
        referralLinkNamesResult.forEach(r => allNames.add(r.name));
        referralNamesResult.forEach(r => allNames.add(r.name));
        
        const options = Array.from(allNames);

        if (directSalesResult.length > 0) {
            options.unshift('Directa');
        }

        return options.sort();
    } catch (error) {
        console.error("Error fetching referral options:", error);
        return [];
    }
}



export async function getSalesForRaffle(raffleId: string) {
  try {
    // 1. Requerir permisos de administrador
    await requireAdmin();

    // 2. Obtener la rifa junto con todas sus compras y tickets
    const raffleData = await db.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
      with: {
        purchases: {
          orderBy: [desc(purchases.createdAt)],
          with: {
            tickets: true,
          },
        },
      },
    });

    // 3. Verifica si la rifa no existe y retorna de inmediato.
    if (!raffleData) {
      console.error(`Rifa con ID ${raffleId} no encontrada.`);
      return null;
    }

    // 4. Desestructurar la información de la rifa solo si raffleData existe.
    // Aquí se declara y se inicializa la variable `purchases`.
    const { purchases: salePurchases, ...raffleInfo } = raffleData;

    // 5. Obtener los totales de tickets.
    const soldTicketsCount = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tickets)
      .where(and(eq(tickets.raffleId, raffleId), eq(tickets.status, 'sold')));
      
    const reservedTicketsCount = await db
      .select({
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(tickets)
      .where(and(eq(tickets.raffleId, raffleId), eq(tickets.status, 'reserved')));

    const totalTicketsSold = soldTicketsCount[0]?.count || 0;
    const totalTicketsReserved = reservedTicketsCount[0]?.count || 0;
    
    return {
      raffle: {
        ...raffleInfo,
        totalTicketsSold,
        totalTicketsReserved,
      },
      sales: salePurchases, // Las compras van como 'sales'
    };
  } catch (error) {
    console.error("Error al obtener datos de ventas para la rifa:", error);
    return null;
  }
}

// --- NUEVA ACCIÓN: OBTENER VENTAS Y ANALÍTICAS PARA EL MÓDULO DE VENTAS ---
export async function getSalesAndAnalyticsForRaffle(raffleId: string) {
  try {
    // 1. Obtener los detalles básicos de la rifa
    const raffleDetails = await db.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
      columns: { id: true, name: true, currency: true, price: true, minimumTickets: true }
    });

    if (!raffleDetails) return null;

    // 2. Obtener todas las compras de la rifa con sus tickets y vendedor (referral)
    const allSales = await db.query.purchases.findMany({
      where: eq(purchases.raffleId, raffleId),
      orderBy: desc(purchases.createdAt),
      with: {
        tickets: { columns: { ticketNumber: true } },
        referral: { columns: { name: true, code: true } }, // ¡Aquí está la magia!
      },
    });

    // 3. Procesar los datos para las analíticas de vendedores
    const analyticsMap = new Map<string, any>();

    // Inicializar la entrada para ventas sin referido
    analyticsMap.set('N/A', {
      sellerName: 'Ventas Directas (N/A)',
      sellerCode: null,
      totalSales: 0,
      confirmedSales: 0,
      totalTickets: 0,
      confirmedTickets: 0,
      totalRevenue: 0,
      confirmedRevenue: 0,
    });

    for (const sale of allSales) {
      const sellerCode = sale.referral?.code ?? 'N/A';
      const sellerName = sale.referral?.name ?? 'Ventas Directas (N/A)';

      if (!analyticsMap.has(sellerCode)) {
        analyticsMap.set(sellerCode, {
          sellerName: sellerName,
          sellerCode: sellerCode,
          totalSales: 0, confirmedSales: 0, totalTickets: 0,
          confirmedTickets: 0, totalRevenue: 0, confirmedRevenue: 0,
        });
      }

      const stats = analyticsMap.get(sellerCode)!;
      const saleAmount = parseFloat(sale.amount);

      stats.totalSales += 1;
      stats.totalTickets += sale.ticketCount;
      stats.totalRevenue += saleAmount;

      if (sale.status === 'confirmed') {
        stats.confirmedSales += 1;
        stats.confirmedTickets += sale.ticketCount;
        stats.confirmedRevenue += saleAmount;
      }
    }

    const sellerAnalytics = Array.from(analyticsMap.values()).sort((a, b) => b.confirmedRevenue - a.confirmedRevenue);

    return {
      raffle: { ...raffleDetails, totalTickets: raffleDetails.minimumTickets },
      sales: allSales,
      sellerAnalytics,
    };

  } catch (error) {
    console.error("Error al obtener las ventas y analíticas de la rifa:", error);
    return null;
  }
}




const UpdatePurchaseInfoSchema = z.object({
  purchaseId: z.string(),
  buyerEmail: z.string().email("Email inválido").optional(),
  buyerPhone: z.string().optional(),
});

export async function updatePurchaseInfoAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();
  } catch (error: any) {
    return { success: false, message: error.message };
  }

  const validatedFields = UpdatePurchaseInfoSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return { success: false, message: "Datos inválidos." };
  }

  const { purchaseId, buyerEmail, buyerPhone } = validatedFields.data;

  try {
    const updateData: any = {};
    if (buyerEmail) updateData.buyerEmail = buyerEmail;
    if (buyerPhone) updateData.buyerPhone = buyerPhone;

    await db.update(purchases)
      .set(updateData)
      .where(eq(purchases.id, purchaseId));

    revalidatePath("/dashboard");
    revalidatePath("/rifas");

    return { success: true, message: "Información actualizada correctamente." };
  } catch (error: any) {
    console.error("Error al actualizar información de compra:", error);
    return { success: false, message: "Error al actualizar la información." };
  }
}

// ✅ --- INICIO: NUEVA ACCIÓN PARA REENVIAR NOTIFICACIONES ---

const ResendTicketsSchema = z.object({
  purchaseId: z.string().min(1, "ID de compra es requerido."),
});

/**
 * Reenvía el correo y el WhatsApp con los tickets a un comprador de una compra ya confirmada.
 * Acción protegida solo para administradores.
 */
export async function resendTicketsNotificationAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // 1. Seguridad: Solo un administrador puede ejecutar esta acción.
    await requireAdmin();

    // 2. Validar el ID de la compra que viene del formulario.
    const validatedFields = ResendTicketsSchema.safeParse(
      Object.fromEntries(formData.entries())
    );
    if (!validatedFields.success) {
      return { success: false, message: "ID de compra inválido." };
    }
    const { purchaseId } = validatedFields.data;

    // 3. Verificar que la compra exista y esté confirmada.
    const purchase = await db.query.purchases.findFirst({
      where: eq(purchases.id, purchaseId),
      columns: { status: true },
    });

    if (!purchase) {
      return { success: false, message: "La compra no fue encontrada." };
    }

    if (purchase.status !== "confirmed") {
      return {
        success: false,
        message: "Solo se pueden reenviar notificaciones de compras confirmadas.",
      };
    }

    // 4. Si todo es correcto, llamar a la función existente para enviar los mensajes.
    await sendTicketsEmailAndWhatsapp(purchaseId);

    // 5. Devolver una respuesta exitosa.
    return { success: true, message: "Notificaciones reenviadas con éxito." };
  } catch (error: any) {
    console.error("Error al reenviar notificaciones:", error);
    return {
      success: false,
      message: error.message || "Ocurrió un error en el servidor.",
    };
  }
}

// ✅ --- FIN: NUEVA ACCIÓN ---

// ✅ --- NUEVA FUNCIÓN AUXILIAR PARA OBTENER DATOS DEL TOP 5 ---
/**
 * Obtiene el Top 5 de compradores con los detalles necesarios para las notificaciones.
 * @param raffleId El ID de la rifa.
 * @returns Una lista de los 5 mejores compradores.
 */
async function getTopBuyersForNotifications(raffleId: string) {
    try {
        const topBuyersData = await db
            .select({
                buyerName: purchases.buyerName,
                buyerEmail: purchases.buyerEmail,
                buyerPhone: purchases.buyerPhone, // Necesitamos el teléfono para WhatsApp
                totalTickets: sql<number>`sum(${purchases.ticketCount})`.mapWith(Number),
            })
            .from(purchases)
            .where(and(
                eq(purchases.raffleId, raffleId),
                eq(purchases.status, 'confirmed')
            ))
            .groupBy(purchases.buyerName, purchases.buyerEmail, purchases.buyerPhone) // Agrupamos por teléfono también
            .orderBy(desc(sql`sum(${purchases.ticketCount})`))
            .limit(5); // Obtenemos el top 5

        return topBuyersData;

    } catch (error) {
        console.error("Error al obtener top compradores para notificaciones:", error);
        return [];
    }
}

/**
 * Revisa el Top 5 después de una compra y envía notificaciones relevantes.
 * @param raffleId - El ID de la rifa afectada.
 * @param currentPurchaseId - El ID de la compra que acaba de ser confirmada.
 */
async function handleTop5Notifications(raffleId: string, currentPurchaseId: string) {
    console.log(`Iniciando lógica de notificación Top 5 para la rifa ${raffleId}`);

    // 1. Obtener los detalles del comprador actual
    const currentPurchase = await db.query.purchases.findFirst({
        where: eq(purchases.id, currentPurchaseId),
    });
    if (!currentPurchase) {
        console.error("No se encontró la compra para la notificación del Top 5.");
        return;
    }

    // 2. Obtener la lista actualizada del Top 5
    const top5 = await getTopBuyersForNotifications(raffleId);
    if (top5.length === 0) return; // No hay nadie en el top, no hacemos nada.

    // 3. Encontrar la posición del comprador actual en el Top 5
    const currentBuyerIndex = top5.findIndex(b => b.buyerEmail === currentPurchase.buyerEmail);

    // Si el comprador actual no entró en el Top 5, terminamos la ejecución.
    if (currentBuyerIndex === -1) {
        console.log(`El comprador ${currentPurchase.buyerEmail} no entró en el Top 5.`);
        return;
    }

    const currentBuyer = top5[currentBuyerIndex];
    const leader = top5[0];

    // 4. Notificar al comprador que entró al Top 5
    if (currentBuyer.buyerEmail === leader.buyerEmail) {
        // Mensaje si se convierte en el #1
        const subject = "¡Felicidades! ¡Eres el número 1! 🏆";
        
        // ▼▼▼ ¡AQUÍ ESTÁ LA MODIFICACIÓN! ▼▼▼
        const message = `¡Felicidades, ${currentBuyer.buyerName}! Has alcanzado el primer puesto en el Top 5 de compradores. ¡Sigue así para ganar el gran premio de 1000$ al primer lugar!`;
        // ▲▲▲ FIN DE LA MODIFICACIÓN ▲▲▲

        await sendEmail({ to: currentBuyer.buyerEmail, subject, body: `<p>🏆 ${message}</p>` });
        if (currentBuyer.buyerPhone) await sendWhatsappMessage(currentBuyer.buyerPhone, `🏆 ${message}`);

    } else {
        // Mensaje si entra al Top 5 pero no es #1
        const ticketsToLead = leader.totalTickets - currentBuyer.totalTickets + 1;
        const subject = "¡Has entrado al Top 5 de compradores! 🔥";
        const message = `¡Felicidades, ${currentBuyer.buyerName}! Has entrado al Top 5. Para alcanzar el primer lugar y superar al líder, necesitas comprar ${ticketsToLead} ticket(s) más. ¡No te rindas!`;
        await sendEmail({ to: currentBuyer.buyerEmail, subject, body: `<p>${message}</p>` });
        if (currentBuyer.buyerPhone) await sendWhatsappMessage(currentBuyer.buyerPhone, `🔥 ${message}`);
    }

    // 5. Notificar a los usuarios que fueron superados por el comprador actual
    for (const otherBuyer of top5) {
        // No nos notificamos a nosotros mismos y solo notificamos a quienes tienen menos tickets que el comprador actual
        if (otherBuyer.buyerEmail !== currentBuyer.buyerEmail && otherBuyer.totalTickets < currentBuyer.totalTickets) {
            const ticketsToReclaim = currentBuyer.totalTickets - otherBuyer.totalTickets + 1;
            const subject = "¡Te han superado en el ranking! ⚔️";
            const message = `¡Atención, ${otherBuyer.buyerName}! El comprador ${currentBuyer.buyerName} te ha superado en el ranking. Compra ${ticketsToReclaim} ticket(s) para recuperar tu posición. ¡La competencia está reñida!`;
            
            await sendEmail({ to: otherBuyer.buyerEmail, subject, body: `<p>${message}</p>` });
            if (otherBuyer.buyerPhone) await sendWhatsappMessage(otherBuyer.buyerPhone, `⚔️ ${message}`);
        }
    }
    console.log("Lógica de notificación Top 5 completada.");
}

/**
 * Obtiene una lista de clientes únicos (por email) para exportar.
 * Ideal para crear audiencias en Meta Ads.
 * @returns {Promise<ActionState>} Una promesa que resuelve con la lista de clientes o un error.
 */
export async function exportCustomersAction(): Promise<ActionState> {
    try {
        // 1. Seguridad: Solo un administrador puede ejecutar esta acción.
        await requireAdmin();

        console.log("Iniciando exportación de clientes únicos...");

        // 2. Consulta a la base de datos usando `selectDistinctOn` de Drizzle.
        // Esto garantiza que solo obtengamos una fila por cada `buyerEmail` único.
        // Ordenamos por `createdAt` descendente para obtener los datos más recientes de un cliente recurrente.
        const customers = await db
            .selectDistinctOn([purchases.buyerEmail], {
                nombre: purchases.buyerName,
                correo: purchases.buyerEmail,
                telefono: purchases.buyerPhone,
            })
            .from(purchases)
            .where(isNotNull(purchases.buyerEmail)) // Opcional: nos aseguramos de no traer nulos.
            .orderBy(asc(purchases.buyerEmail), desc(purchases.createdAt));

        console.log(`Se encontraron ${customers.length} clientes únicos.`);

        // 3. Devolver los datos en el formato estándar de ActionState.
        return {
            success: true,
            message: "Clientes únicos obtenidos exitosamente.",
            data: customers,
        };
    } catch (error: any) {
        console.error("Error al exportar clientes:", error);
        return {
            success: false,
            message: error.message || "Ocurrió un error en el servidor al exportar los clientes.",
        };
    }
}

/**
 * Revisa si hay compras pendientes nuevas desde la última vez que se revisó.
 * Esta acción es llamada repetidamente por el frontend (Polling).
 * @param lastCheckTimestamp - La fecha ISO de la última revisión.
 * @returns Una promesa que resuelve con un array de nuevas compras pendientes.
 */
export async function checkForNewPurchases(lastCheckTimestamp: string): Promise<Purchase[]> {
    try {
        // La consulta original está bien, necesitamos los datos de la rifa para el frontend,
        // pero solo los usaremos para construir el objeto final si es necesario en otro lado.
        // Para esta función, solo nos aseguramos de devolver el tipo 'Purchase' correcto.
        const lastCheckDate = new Date(lastCheckTimestamp);

        const newPurchasesFromDb = await db.query.purchases.findMany({
            where: and(
                eq(purchases.status, "pending"),
                sql`${purchases.createdAt} > ${lastCheckDate}`
            ),
            // El 'with' no es estrictamente necesario si solo devolvemos el tipo 'Purchase',
            // pero lo dejamos por si se necesita en el futuro.
            with: {
                raffle: {
                    columns: { name: true, currency: true }
                }
            },
            orderBy: desc(purchases.createdAt),
        });

        // Hacemos el mapeo para que coincida EXACTAMENTE con tu tipo 'Purchase'
        return newPurchasesFromDb.map(purchase => ({
            id: purchase.id,
            amount: purchase.amount,
            status: purchase.status,
            buyerName: purchase.buyerName,
            buyerEmail: purchase.buyerEmail,
            buyerPhone: purchase.buyerPhone,
            paymentReference: purchase.paymentReference,
            paymentScreenshotUrl: purchase.paymentScreenshotUrl,
            paymentMethod: purchase.paymentMethod,
            ticketCount: purchase.ticketCount,
            createdAt: purchase.createdAt,
            raffleId: purchase.raffleId, // CORRECTO: Usamos el ID de la rifa
            rejectionReason: purchase.rejectionReason, // AÑADIDO: Campo requerido por el tipo
            rejectionComment: purchase.rejectionComment, // AÑADIDO: Campo requerido por el tipo
        }));

    } catch (error) {
        console.error("Error durante el polling de compras:", error);
        return [];
    }
}

export async function getDashboardStats(): Promise<{
    totalPendingPurchases: number;
    totalConfirmedToday: number;
    totalRevenueToday: number;
    activeRaffles: number;
}> {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const [pendingCount, confirmedToday, revenueToday, activeRafflesCount] = await Promise.all([
            db.select({ count: sql<number>`count(*)`.mapWith(Number) })
                .from(purchases)
                .where(eq(purchases.status, 'pending')),
            
            db.select({ count: sql<number>`count(*)`.mapWith(Number) })
                .from(purchases)
                .where(and(
                    eq(purchases.status, 'confirmed'),
                    sql`${purchases.createdAt} >= ${today}`,
                    sql`${purchases.createdAt} < ${tomorrow}`
                )),
            
            db.select({ total: sql<number>`sum(${purchases.amount}::decimal)`.mapWith(Number) })
                .from(purchases)
                .where(and(
                    eq(purchases.status, 'confirmed'),
                    sql`${purchases.createdAt} >= ${today}`,
                    sql`${purchases.createdAt} < ${tomorrow}`
                )),
            
            db.select({ count: sql<number>`count(*)`.mapWith(Number) })
                .from(raffles)
                .where(eq(raffles.status, 'active'))
        ]);

        return {
            totalPendingPurchases: pendingCount[0]?.count || 0,
            totalConfirmedToday: confirmedToday[0]?.count || 0,
            totalRevenueToday: revenueToday[0]?.total || 0,
            activeRaffles: activeRafflesCount[0]?.count || 0
        };
    } catch (error) {
        console.error("Error obteniendo estadísticas del dashboard:", error);
        return {
            totalPendingPurchases: 0,
            totalConfirmedToday: 0,
            totalRevenueToday: 0,
            activeRaffles: 0
        };
    }
}