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
} from "./db/schema";
import { revalidatePath } from "next/cache";
import { eq, desc, inArray, and, lt, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { uploadToS3, deleteFromS3 } from "./s3";
import crypto from "crypto";
import { Resend } from "resend";
import { sendWhatsappMessage } from "@/features/whatsapp/actions";
import { RaffleSalesData, PurchaseWithTicketsAndRaffle } from "./types";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- Credenciales de Pabilo (AHORA DESDE .ENV) ---
const PABILO_API_KEY = process.env.PABILO_API_KEY;
const PABILO_API_URL = process.env.PABILO_API_URL;

// --- TIPOS DE RESPUESTA
export type ActionState = {
  success: boolean;
  message: string;
  data?: any;
};

// ----------------------------------------------------------------
// ACTIONS PARA AUTENTICACIÓN
// ----------------------------------------------------------------

const RegisterSchema = z.object({
  name: z.string().min(2, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  role: z.enum(["admin", "user"]).default("user"),
});

export async function registerAction(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const validatedFields = RegisterSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) return { success: false, message: "Error de validación" };
  
  const { name, email, password, role } = validatedFields.data;

  try {
    const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existingUser) return { success: false, message: "El email ya está registrado" };

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await db.insert(users).values({ name, email, password: hashedPassword, role }).returning({ id: users.id });
    
    revalidatePath("/usuarios");

    return { success: true, message: "Usuario registrado exitosamente", data: newUser[0] };

  } catch (error) {
    console.error("Error al registrar usuario:", error);
    return { success: false, message: "Error del servidor" };
  }
}

// --- NUEVA ACCIÓN: OBTENER VENTAS DETALLADAS PARA UNA RIFA ---
export async function getSalesForRaffle(raffleId: string): Promise<RaffleSalesData | null> {
  try {
    const raffleDetails = await db.query.raffles.findFirst({
      where: eq(raffles.id, raffleId),
      columns: {
        id: true,
        name: true,
        currency: true,
        price: true,
      }
    });

    if (!raffleDetails) {
      return null;
    }

    const sales = await db.query.purchases.findMany({
      where: eq(purchases.raffleId, raffleId),
      orderBy: desc(purchases.createdAt),
      with: {
        tickets: {
          columns: {
            ticketNumber: true,
          }
        },
      },
    });

    // Unimos los datos para que el componente cliente tenga todo lo que necesita
    const salesWithRaffleInfo = sales.map(sale => ({
      ...sale,
      raffle: raffleDetails, // Adjuntamos la info de la rifa a cada venta
    }));

    return {
      raffle: raffleDetails,
      sales: salesWithRaffleInfo as PurchaseWithTicketsAndRaffle[],
    };

  } catch (error) {
    console.error("Error al obtener las ventas de la rifa:", error);
    return null;
  }
}

// ✅ --- NUEVA FUNCIÓN: ENVIAR NOTIFICACIÓN DE RECHAZO ---
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

// --- NUEVA ACCIÓN: OBTENER TOP COMPRADORES ---
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
      .limit(5);

    return topBuyersData;

  } catch (error) {
    console.error("Error al obtener top compradores:", error);
    return [];
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


async function sendWinnerNotification(raffleId: string, winnerTicketId: string): Promise<void> {
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

  if (!winnerData || !winnerData.purchase || !winnerData.raffle) {
    console.error(`No se pudo encontrar la información completa para notificar al ganador del ticket ID: ${winnerTicketId}`);
    return;
  }

  const { raffle, purchase, ticketNumber } = winnerData;
  const buyerName = purchase.buyerName || 'Ganador';

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

  await sendEmail({ to: purchase.buyerEmail, subject, body: emailBody });

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
    <p>El equipo de Llevateloconjorvi.</p>
  `;
  
  await sendEmail({ to: purchase.buyerEmail, subject, body: emailBody });

  const whatsappText = `¡Hola, ${purchase.buyerName}! 🎉\n\nTu compra para la rifa *${purchase.raffle.name}* ha sido confirmada.\n\nAquí están tus tickets de la suerte:\n\n*${ticketNumbers}*\n\n¡Mucha suerte! Revisa tu email para más detalles. 😉`;
  
  if (purchase.buyerPhone && purchase.buyerPhone.trim() !== '') {
    console.log(`Intentando enviar WhatsApp al número: ${purchase.buyerPhone}`);
    try {
      await sendWhatsappMessage(purchase.buyerPhone, whatsappText);
      console.log(`WhatsApp enviado con éxito a ${purchase.buyerPhone}`);
    } catch (error) {
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
  
  const text = `¡Hola, ${purchase.buyerName}! 👋\n\nRecibimos tu solicitud de compra para la rifa *${purchase.raffle.name}*. \n\nTu pago está siendo verificado. Te notificaremos por aquí y por correo una vez que sea aprobado. ¡Gracias por participar!`;

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
      const raffle = await tx.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
      if (!raffle) throw new Error("Rifa no encontrada.");
      if (raffle.status !== 'active') throw new Error("La rifa no está activa.");

      const existingTicketsCount = await tx.select({ count: sql`count(*)` })
        .from(tickets)
        .where(eq(tickets.raffleId, raffleId));
      
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

        const batchSize = 1000;
        for (let i = 0; i < ticketsToGenerate.length; i += batchSize) {
          const batch = ticketsToGenerate.slice(i, i + batchSize);
          await tx.insert(tickets).values(batch);
        }
        console.log(`Tickets generados exitosamente para la rifa ${raffleId}`);
      }

      await tx.update(tickets).set({ status: 'available', reservedUntil: null, purchaseId: null }).where(and(eq(tickets.raffleId, raffleId), eq(tickets.status, 'reserved'), lt(tickets.reservedUntil, new Date())));
      
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
  paymentScreenshot: z.instanceof(File).refine(file => file.size > 0, "La captura es requerida."),
  reservedTickets: z.string().min(1, "No hay tickets apartados para comprar."),
  captchaToken: z.string().min(1, "Por favor, completa la verificación CAPTCHA."),
});

export async function buyTicketsAction(formData: FormData): Promise<ActionState> {
  const data = Object.fromEntries(formData.entries());
  const paymentScreenshotFile = formData.get('paymentScreenshot') as File | null;
  const captchaToken = formData.get('captchaToken') as string;

  try {
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecret) {
        console.error("La clave secreta de reCAPTCHA no está configurada.");
        return { success: false, message: "Error de configuración del servidor." };
    }

    const response = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${recaptchaSecret}&response=${captchaToken}`,
    });

    const captchaValidation = await response.json();

    if (!captchaValidation.success) {
        console.warn("Verificación de reCAPTCHA fallida:", captchaValidation['error-codes']);
        return { success: false, message: "Falló la verificación CAPTCHA. Intenta de nuevo." };
    }
  } catch (error) {
    console.error("Error al verificar CAPTCHA:", error);
    return { success: false, message: "No se pudo verificar el CAPTCHA. Revisa tu conexión." };
  }
  
  const validatedFields = BuyTicketsSchema.safeParse({ ...data, paymentScreenshot: paymentScreenshotFile });

  if (!validatedFields.success) {
    return { success: false, message: "Error de validación: " + JSON.stringify(validatedFields.error.flatten().fieldErrors) };
  }

  const { name, email, phone, raffleId, paymentReference, paymentMethod, reservedTickets } = validatedFields.data;
  const ticketNumbers = reservedTickets.split(',');
  let paymentScreenshotUrl = '';

  try {
    const buffer = Buffer.from(await validatedFields.data.paymentScreenshot.arrayBuffer());
    const key = `purchases/${crypto.randomUUID()}-${validatedFields.data.paymentScreenshot.name}`;
    paymentScreenshotUrl = await uploadToS3(buffer, key, validatedFields.data.paymentScreenshot.type);
  } catch (error) {
    console.error("Error al subir captura:", error);
    return { success: false, message: "Error al subir la imagen del pago." };
  }

  try {
    const raffle = await db.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
    if (!raffle) return { success: false, message: "La rifa no existe." };
    const amount = ticketNumbers.length * parseFloat(raffle.price);
    let purchaseStatus: "pending" | "confirmed" = "pending";
    let responseMessage = "¡Compra registrada! Recibirás un correo cuando tus tickets sean aprobados.";

    const selectedPaymentMethod = await db.query.paymentMethods.findFirst({ where: eq(paymentMethods.title, paymentMethod) });

    if (selectedPaymentMethod && selectedPaymentMethod.triggersApiVerification) {
      // ✅ --- VERIFICACIÓN DE VARIABLES DE ENTORNO ---
      if (!PABILO_API_URL || !PABILO_API_KEY) {
        console.error("⛔ Las credenciales de Pabilo no están configuradas en el archivo .env.");
        // Se procede con la verificación manual en lugar de detener la compra.
      } else {
        const referenceToSend = paymentReference.slice(-4);
        const amountToSend = Math.round(amount);
        console.log(`🔵 Intentando verificar con Pabilo para [${paymentMethod}]...`);
        console.log({ amount: amountToSend, bank_reference: referenceToSend });

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 65000);

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
            console.warn("⚠️ Pabilo NO encontró el pago. Pasando a verificación manual.");
          }
        } catch (apiError: any) {
          if (apiError.name === 'AbortError') {
              console.error("⛔ La API de Pabilo tardó demasiado en responder (timeout). Pasando a verificación manual.");
          } else {
              console.error("⛔ Error de conexión con la API de Pabilo.", apiError);
          }
        }
      }
    }

    const newPurchase = await db.transaction(async (tx) => {
      const ticketsToUpdate = await tx.select({ id: tickets.id }).from(tickets).where(and(eq(tickets.raffleId, raffleId), inArray(tickets.ticketNumber, ticketNumbers), eq(tickets.status, 'reserved')));
      if (ticketsToUpdate.length !== ticketNumbers.length) throw new Error("Tu reservación expiró o los tickets ya no son válidos. Intenta de nuevo.");

      const [createdPurchase] = await tx.insert(purchases).values({
        raffleId, buyerName: name, buyerEmail: email, buyerPhone: phone, ticketCount: ticketNumbers.length,
        amount: amount.toString(), paymentMethod, paymentReference, paymentScreenshotUrl, status: purchaseStatus,
      }).returning({ id: purchases.id });

      await tx.update(tickets).set({
        status: purchaseStatus === 'confirmed' ? 'sold' : 'reserved',
        purchaseId: createdPurchase.id,
        reservedUntil: null,
      }).where(inArray(tickets.id, ticketsToUpdate.map(t => t.id)));

      return createdPurchase;
    });

    revalidatePath(`/rifas/${raffleId}`);
    revalidatePath("/dashboard");

    if (purchaseStatus === 'confirmed') {
      await sendTicketsEmailAndWhatsapp(newPurchase.id);
    } else {
      await sendConfirmationEmail(newPurchase.id);
      await sendConfirmationWhatsapp(newPurchase.id);
    }

    return { success: true, message: responseMessage, data: newPurchase };
  } catch (error: any) {
    console.error("Error al comprar tickets:", error);
    return { success: false, message: error.message || "Ocurrió un error en el servidor." };
  }
}

const UpdatePurchaseStatusSchema = z.object({
  purchaseId: z.string(),
  newStatus: z.enum(purchaseStatusEnum.enumValues),
  rejectionReason: z.enum(rejectionReasonEnum.enumValues).optional(),
  rejectionComment: z.string().optional(),
});

export async function updatePurchaseStatusAction(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const validatedFields = UpdatePurchaseStatusSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success)
    return { success: false, message: "Datos inválidos." };
  
  const { purchaseId, newStatus, rejectionReason, rejectionComment } = validatedFields.data;

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
      await tx.update(purchases).set({ 
        status: newStatus,
        ...(newStatus === 'rejected' && {
            rejectionReason: rejectionReason,
            rejectionComment: rejectionComment
        })
      }).where(eq(purchases.id, purchaseId));
      
      if (newStatus === "confirmed") {
        await tx.update(tickets).set({ status: "sold" }).where(eq(tickets.purchaseId, purchaseId));
        await sendTicketsEmailAndWhatsapp(purchaseId);
      } else if (newStatus === "rejected") {
        await tx.update(tickets).set({ status: "available", purchaseId: null, reservedUntil: null }).where(eq(tickets.purchaseId, purchaseId));
        if (rejectionReason) {
            await sendRejectionNotification(purchaseId, rejectionReason, rejectionComment);
        }
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/mis-tickets");
    revalidatePath(`/rifas`);

    return {
      success: true,
      message: `La compra ha sido ${newStatus === "confirmed" ? "confirmada" : "rechazada y notificada"}.`,
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
    const newRaffle = await db.transaction(async (tx) => {
      const [createdRaffle] = await tx.insert(raffles).values({
        name, 
        description, 
        price: price.toString(), 
        minimumTickets, 
        status: "draft", 
        limitDate: new Date(limitDate),
        currency,
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
      const currentRaffle = await tx.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
      if (!currentRaffle) throw new Error("Rifa no encontrada.");

      await tx.update(raffles).set({ status, updatedAt: new Date() }).where(eq(raffles.id, raffleId));

      if (currentRaffle.status === 'draft' && status === 'active') {
    console.log(`Iniciando generación masiva de tickets para la rifa ${raffleId}...`);

    // 1. Prepara todos los tickets en un solo array, como antes.
    const ticketsToGenerate = [];
    for (let i = 0; i < 10000; i++) {
        const ticketNumber = i.toString().padStart(4, '0');
        ticketsToGenerate.push({
            ticketNumber,
            raffleId,
            status: 'available' as const,
        });
        
        }



        await tx.insert(tickets).values(ticketsToGenerate);

    console.log(`¡${ticketsToGenerate.length} tickets generados exitosamente en una sola operación!`);
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

    await sendWinnerNotification(raffleId, winningTicket.id);

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
    if (!raffle || raffle.status !== 'finished') return { success: false, message: "La rifa no puede ser pospuesta en su estado actual." };

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

export async function generateTicketsForRaffle(raffleId: string): Promise<ActionState> {
  try {
    const result = await db.transaction(async (tx) => {
      const raffle = await tx.query.raffles.findFirst({ where: eq(raffles.id, raffleId) });
      if (!raffle) {
        throw new Error("Rifa no encontrada.");
      }
      if (raffle.status !== 'active') {
        throw new Error("Solo se pueden generar tickets para rifas activas.");
      }

      const existingTickets = await tx.query.tickets.findMany({ 
        where: eq(tickets.raffleId, raffleId),
        limit: 1 
      });
      
      if (existingTickets.length > 0) {
        throw new Error("Esta rifa ya tiene tickets generados.");
      }

      const ticketsToGenerate = [];
      for (let i = 0; i < 10000; i++) {
        const ticketNumber = i.toString().padStart(4, '0');
        ticketsToGenerate.push({
          ticketNumber,
          raffleId,
          status: 'available' as const,
        });
      }

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
    binancePayId,
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
      binancePayId,
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
    binancePayId,
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
      binancePayId,
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

    revalidatePath("/usuarios");
    return { success: true, message: "Usuario eliminado con éxito." };

  } catch (error: any) {
    console.error("Error al eliminar usuario:", error);
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
    if (error.code === '23505') {
      return { success: false, message: "Este correo o número de WhatsApp ya está registrado." };
    }
    console.error("Error al registrar en la lista de espera:", error);
    return { success: false, message: "Ocurrió un error en el servidor. Inténtalo de nuevo." };
  }
}


async function notifyWaitlistAboutNewRaffle(raffleId: string, raffleName: string, rafflePrice: string, raffleCurrency: 'USD' | 'VES') {
  console.log(`Iniciando notificación a la lista de espera para la rifa: ${raffleName}`);
  
  try {
    const subscribers = await db.query.waitlistSubscribers.findMany();

    if (subscribers.length === 0) {
      console.log("No hay suscriptores en la lista de espera para notificar.");
      return;
    }

    const priceFormatted = raffleCurrency === 'USD' ? `$${rafflePrice}` : `Bs. ${rafflePrice}`;
    const raffleUrl = `https://llevateloconjorvi.com/rifa/${raffleId}`;

    for (const subscriber of subscribers) {
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

      const whatsappText = `¡Hola ${subscriber.name}! 👋\n\n🎉 ¡Ya está disponible nuestra nueva rifa: *${raffleName}*!\n\nPuedes ganar un premio increíble por solo *${priceFormatted}*.\n\n¡No te quedes fuera! Participa ahora mismo entrando a este enlace:\n${raffleUrl}\n\n¡Mucha suerte! 🍀`;

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