// lib/types.ts

type ReferralLink = {
  name: string;
} | null;

export type Raffle = {
  id: string;
  name: string;
  currency: 'USD' | 'VES';
  price: string;
};

type Ticket = {
  ticketNumber: string;
};

export type Purchase = {
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
  rejectionReason: 'invalid_payment' | 'malicious' | null;
  rejectionComment: string | null;
};

// El tipo combinado que usará nuestro módulo de ventas
export type PurchaseWithTicketsAndRaffle = Purchase & {
  tickets: Ticket[];
  raffle: Raffle;
  referralLink: ReferralLink;
  referral?: { name: string } | null;
  // --- TIPO CORREGIDO ---
  // Ahora espera un arreglo del tipo 'Purchase' principal.
  similarReferences?: Purchase[]; 
};

export type RaffleSalesData = {
  raffle: Raffle;
  sales: PurchaseWithTicketsAndRaffle[];
};