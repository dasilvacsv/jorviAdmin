CREATE TABLE "referral_links" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_links_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "raffle_exchange_rates" DROP CONSTRAINT "raffle_exchange_rates_raffle_id_unique";--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "key" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "referral_link_id" text;--> statement-breakpoint
ALTER TABLE "raffles" ADD COLUMN "slug" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_referral_link_id_referral_links_id_fk" FOREIGN KEY ("referral_link_id") REFERENCES "public"."referral_links"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "raffles" ADD CONSTRAINT "raffles_slug_unique" UNIQUE("slug");