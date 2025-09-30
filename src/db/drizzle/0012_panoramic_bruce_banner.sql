CREATE TABLE "referrals" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"code" varchar(4) NOT NULL,
	"commission_rate" numeric(10, 2) DEFAULT '0.50' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_email_unique" UNIQUE("email"),
	CONSTRAINT "referrals_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "system_settings" ALTER COLUMN "key" SET DATA TYPE varchar(256);--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "referral_id" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
