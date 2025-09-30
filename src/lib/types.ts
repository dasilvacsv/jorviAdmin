// lib/types.ts

// Tipo para el link de referido, puede ser nulo si la venta es directa
type ReferralLink = {
  name: string;
} | null;

// Tipos extraídos de tu schema para claridad
export type Raffle = {
  id: string;
  name: string;
  currency: 'USD' | 'VES';
  price: string;
};

type Ticket = {
  ticketNumber: string;
};

type Purchase = {
  id: string;
  amount: string;
  status: 'pending' | 'confirmed' | 'rejected';
  buyerName: string | null;
  buyerEmail: string;
  buyerPhone: string | null;
  paymentReference: string | null;
  paymentScreenshotUrl: string | null;
  paymentMethod: string | null;
  ticketCount: number;
  createdAt: Date;
  raffleId: string;
  // --- CAMPOS AÑADIDOS ---
  rejectionReason: 'invalid_payment' | 'malicious' | null;
  rejectionComment: string | null;
};

// Tipo combinado que usará nuestro módulo de ventas
export type PurchaseWithTicketsAndRaffle = Purchase & {
  tickets: Ticket[];
  raffle: Raffle;
  // --- RELACIÓN AÑADIDA ---
  referralLink: ReferralLink;
};

export type RaffleSalesData = {
  raffle: Raffle;
  sales: PurchaseWithTicketsAndRaffle[];
};