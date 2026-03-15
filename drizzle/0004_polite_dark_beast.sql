ALTER TABLE "organizations" ADD COLUMN "siret" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "vat_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "primary_color" text DEFAULT '#4f46e5';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "font_family" text DEFAULT 'inter';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "custom_footer" text;