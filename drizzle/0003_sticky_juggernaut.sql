CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" varchar(50),
	"client_secret" varchar(100),
	"name" varchar(100) NOT NULL,
	"url" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"short_code" varchar(10),
	"short_code_expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "clients_client_id_unique" UNIQUE("client_id"),
	CONSTRAINT "clients_short_code_unique" UNIQUE("short_code")
);
