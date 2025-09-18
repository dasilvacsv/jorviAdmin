// lib/types.ts

// Tipos extraídos de tu schema para claridad
type Raffle = {
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
};

// Tipo combinado que usará nuestro módulo de ventas
export type PurchaseWithTicketsAndRaffle = Purchase & {
  tickets: Ticket[];
  raffle: Raffle;
};

export type RaffleSalesData = {
  raffle: Raffle;
  sales: PurchaseWithTicketsAndRaffle[];
};