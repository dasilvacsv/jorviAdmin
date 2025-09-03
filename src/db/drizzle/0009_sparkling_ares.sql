CREATE TABLE "waitlist_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"whatsapp" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_subscribers_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_subscribers_whatsapp_unique" UNIQUE("whatsapp")
);
