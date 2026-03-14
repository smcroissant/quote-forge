CREATE TABLE "payment_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"reminder_number" integer NOT NULL,
	"type" text DEFAULT 'email' NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"email_subject" text,
	"email_content" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminders_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminder_day_1" integer DEFAULT 7;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminder_day_2" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminder_day_3" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "reminder_email_subject" text;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_reminders_invoice_idx" ON "payment_reminders" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "payment_reminders_org_idx" ON "payment_reminders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "payment_reminders_status_idx" ON "payment_reminders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payment_reminders_scheduled_idx" ON "payment_reminders" USING btree ("scheduled_at");