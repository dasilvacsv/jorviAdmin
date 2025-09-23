// lib/db/schema.ts
import {
  pgTable,
  text,
  varchar,
  decimal,
  integer,
  timestamp,
  boolean,
  pgEnum,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { relations } from 'drizzle-orm';

// ----------------------------------------------------------------
// ENUMs (Tipos de datos personalizados para estados)
// ----------------------------------------------------------------

export const raffleStatusEnum = pgEnum("raffle_status", ["active", "finished", "cancelled", "draft", "postponed"]);
export const purchaseStatusEnum = pgEnum("purchase_status", ["pending", "confirmed", "rejected"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["available", "reserved", "sold"]);
export const currencyEnum = pgEnum("currency", ["USD", "VES"]);
export const rejectionReasonEnum = pgEnum("rejection_reason", ["invalid_payment", "malicious"]);

// ----------------------------------------------------------------
// TABLAS PRINCIPALES
// ----------------------------------------------------------------

export const users = pgTable("users", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    name: varchar("name", { length: 256 }),
    email: varchar("email", { length: 256 }).notNull().unique(),
    password: text("password"),
    role: text("role", { enum: ["admin", "user"] }).default("user").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const raffles = pgTable("raffles", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: varchar("name", { length: 256 }).notNull(),
  // 👇 Campo 'slug' para URLs amigables y únicas
  slug: varchar("slug", { length: 256 }).notNull().unique(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  minimumTickets: integer("minimum_tickets").notNull().default(10000),
  status: raffleStatusEnum("status").default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  winnerTicketId: text("winner_ticket_id").references(() => tickets.id),
  currency: currencyEnum("currency").default("USD").notNull(),
  limitDate: timestamp("limit_date").notNull(),
  winnerLotteryNumber: varchar("winner_lottery_number", { length: 10 }),
  winnerProofUrl: text("winner_proof_url"),
});

export const purchases = pgTable("purchases", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: purchaseStatusEnum("status").default("pending").notNull(),
  buyerName: varchar("buyer_name", { length: 256 }),
  buyerEmail: varchar("buyer_email", { length: 256 }).notNull(),
  buyerPhone: varchar("buyer_phone", { length: 50 }),
  paymentReference: text("payment_reference"),
  paymentScreenshotUrl: text("payment_screenshot_url"),
  paymentMethod: varchar("payment_method", { length: 256 }),
  ticketCount: integer("ticket_count").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  raffleId: text("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }),
  rejectionReason: rejectionReasonEnum("rejection_reason"),
  rejectionComment: text("rejection_comment"),
});

export const tickets = pgTable("tickets", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  ticketNumber: varchar("ticket_number", { length: 4 }).notNull(),
  raffleId: text("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }),
  purchaseId: text("purchase_id").references(() => purchases.id, { onDelete: "set null" }),
  status: ticketStatusEnum("status").default("available").notNull(),
  reservedUntil: timestamp("reserved_until"),
}, (table) => {
    return {
      raffleTicketUnq: uniqueIndex("raffle_ticket_unq").on(table.raffleId, table.ticketNumber),
    };
});

export const systemSettings = pgTable("system_settings", {
    id: text("id").primaryKey().$defaultFn(() => createId()),
    key: varchar("key", { length: 256 }).notNull().unique(),
    value: text("value").notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const raffleExchangeRates = pgTable("raffle_exchange_rates", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  raffleId: text("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }).unique(),
  usdToVesRate: decimal("usd_to_ves_rate", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ----------------------------------------------------------------
// TABLAS SECUNDARIAS Y DE RELACIÓN
// ----------------------------------------------------------------

export const raffleImages = pgTable("raffle_images", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  url: text("url").notNull(),
  raffleId: text("raffle_id").notNull().references(() => raffles.id, { onDelete: "cascade" }),
});

export const paymentMethods = pgTable("payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: varchar("title", { length: 256 }).notNull().unique(),
  iconUrl: text("icon_url"),
  accountHolderName: varchar("account_holder_name", { length: 256 }),
  rif: varchar("rif", { length: 20 }),
  phoneNumber: varchar("phone_number", { length: 20 }),
  bankName: varchar("bank_name", { length: 100 }),
  accountNumber: varchar("account_number", { length: 20 }),
  walletAddress: text("wallet_address"),
  network: varchar("network", { length: 50 }),
  email: varchar("email", { length: 256 }),
  binancePayId: varchar("binance_pay_id", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  triggersApiVerification: boolean("triggers_api_verification").default(false).notNull(),
});

// ----------------------------------------------------------------
// NUEVA TABLA PARA LA LISTA DE ESPERA (WAITLIST)
// ----------------------------------------------------------------

export const waitlistSubscribers = pgTable("waitlist_subscribers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  whatsapp: varchar("whatsapp", { length: 50 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ----------------------------------------------------------------
// RELACIONES
// ----------------------------------------------------------------

export const raffleExchangeRateRelations = relations(raffleExchangeRates, ({ one }) => ({
    raffle: one(raffles, {
        fields: [raffleExchangeRates.raffleId],
        references: [raffles.id],
    }),
}));

export const raffleRelations = relations(raffles, ({ many, one }) => ({
  purchases: many(purchases),
  tickets: many(tickets),
  images: many(raffleImages),
  winnerTicket: one(tickets, {
    fields: [raffles.winnerTicketId],
    references: [tickets.id],
  }),
  exchangeRate: one(raffleExchangeRates, {
    fields: [raffles.id],
    references: [raffleExchangeRates.raffleId],
  }),
}));

export const purchaseRelations = relations(purchases, ({ one, many }) => ({
  raffle: one(raffles, {
    fields: [purchases.raffleId],
    references: [raffles.id],
  }),
  tickets: many(tickets),
}));

export const ticketRelations = relations(tickets, ({ one }) => ({
  raffle: one(raffles, {
    fields: [tickets.raffleId],
    references: [raffles.id],
  }),
  purchase: one(purchases, {
    fields: [tickets.purchaseId],
    references: [purchases.id],
  }),
}));

export const raffleImagesRelations = relations(raffleImages, ({ one }) => ({
  raffle: one(raffles, {
    fields: [raffleImages.raffleId],
    references: [raffles.id],
  }),
}));