CREATE TYPE "public"."currency" AS ENUM('USD', 'VES');--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "account_holder_name" varchar(256);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "rif" varchar(20);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "phone_number" varchar(20);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "bank_name" varchar(100);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "account_number" varchar(20);--> statement-breakpoint
ALTER TABLE "raffles" ADD COLUMN "currency" "currency" DEFAULT 'USD' NOT NULL;