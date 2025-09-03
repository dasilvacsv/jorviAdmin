CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'confirmed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."raffle_status" AS ENUM('active', 'finished', 'cancelled', 'draft');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('available', 'reserved', 'sold');--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" text PRIMARY KEY NOT NULL,
	"title" varchar(256) NOT NULL,
	"details" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "payment_methods_title_unique" UNIQUE("title")
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" text PRIMARY KEY NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"buyer_name" varchar(256),
	"buyer_email" varchar(256) NOT NULL,
	"buyer_phone" varchar(50),
	"payment_reference" text,
	"payment_screenshot_url" text,
	"payment_method" varchar(256),
	"ticket_count" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"raffle_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffle_images" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"raffle_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "raffles" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"price" numeric(10, 2) NOT NULL,
	"minimum_tickets" integer DEFAULT 10000 NOT NULL,
	"status" "raffle_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"winner_ticket_id" text
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_number" varchar(4) NOT NULL,
	"raffle_id" text NOT NULL,
	"purchase_id" text,
	"status" "ticket_status" DEFAULT 'available' NOT NULL,
	"reserved_until" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"email" varchar(256) NOT NULL,
	"password" text,
	"role" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffle_images" ADD CONSTRAINT "raffle_images_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_winner_ticket_id_tickets_id_fk" FOREIGN KEY ("winner_ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_raffle_id_raffles_id_fk" FOREIGN KEY ("raffle_id") REFERENCES "public"."raffles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "raffle_ticket_unq" ON "tickets" USING btree ("raffle_id","ticket_number");