CREATE TABLE "device_votes" (
	"id" serial PRIMARY KEY,
	"device_id" text NOT NULL UNIQUE,
	"neighborhood" text NOT NULL,
	"voted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "neighborhood_votes" (
	"id" serial PRIMARY KEY,
	"neighborhood" text NOT NULL UNIQUE,
	"votes" integer DEFAULT 0 NOT NULL
);
