CREATE TYPE "public"."rejection_reason" AS ENUM('invalid_payment', 'malicious');--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "rejection_reason" "rejection_reason";--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "rejection_comment" text;