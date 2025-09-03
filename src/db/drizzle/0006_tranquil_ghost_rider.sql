ALTER TABLE "payment_methods" ADD COLUMN "wallet_address" text;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "network" varchar(50);--> statement-breakpoint
ALTER TABLE "payment_methods" ADD COLUMN "email" varchar(256);--> statement-breakpoint
ALTER TABLE "payment_methods" DROP COLUMN "details";