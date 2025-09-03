ALTER TYPE "public"."raffle_status" ADD VALUE 'postponed';--> statement-breakpoint
ALTER TABLE "raffles" ADD COLUMN "limit_date" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "raffles" ADD COLUMN "winner_lottery_number" varchar(10);--> statement-breakpoint
ALTER TABLE "raffles" ADD COLUMN "winner_proof_url" text;