import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  invoices, clients, organizations, paymentReminders, quoteActivities,
} from "@/db/schema";
import { eq, and, inArray, lt, isNull } from "drizzle-orm";
import { resend, FROM_EMAIL } from "@/lib/email/client";
import {
  generateReminderEmailHTML,
  getReminderEmailSubject,
} from "@/lib/email/reminder-template";

// ── POST /api/cron/payment-reminders ────────────────
// Called by Vercel Cron or external scheduler daily
// Requires CRON_SECRET header for authentication
export async function POST(request: NextRequest) {
  // ── Auth check ──
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const results = { processed: 0, sent: 0, failed: 0, skipped: 0 };

    // ── 1. Create new reminders for invoices that need them ──
    await createPendingReminders(now);

    // ── 2. Process pending reminders that are due ──
    const pendingReminders = await db
      .select({
        reminder: paymentReminders,
        invoice: invoices,
        client: clients,
        org: organizations,
      })
      .from(paymentReminders)
      .innerJoin(invoices, eq(paymentReminders.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(organizations, eq(paymentReminders.organizationId, organizations.id))
      .where(
        and(
          eq(paymentReminders.status, "pending"),
          lt(paymentReminders.scheduledAt, now)
        )
      );

    for (const item of pendingReminders) {
      results.processed++;
      const { reminder, invoice, client, org } = item;

      // Skip if invoice is already paid or cancelled
      if (invoice.status === "paid" || invoice.status === "cancelled") {
        await db
          .update(paymentReminders)
          .set({ status: "skipped", sentAt: now })
          .where(eq(paymentReminders.id, reminder.id));
        results.skipped++;
        continue;
      }

      // Skip if no client email
      if (!client.email) {
        await db
          .update(paymentReminders)
          .set({ status: "skipped", sentAt: now, errorMessage: "No client email" })
          .where(eq(paymentReminders.id, reminder.id));
        results.skipped++;
        continue;
      }

      // Calculate days overdue
      const sentAt = invoice.sentAt ?? invoice.createdAt;
      const daysOverdue = Math.floor(
        (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Build email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const emailData = {
        invoiceNumber: invoice.invoiceNumber,
        clientName: client.name,
        total: invoice.total,
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
        daysOverdue,
        reminderNumber: reminder.reminderNumber,
        orgName: org.name,
        orgEmail: org.email,
        bankIban: org.bankIban,
        bankBic: org.bankBic,
      };

      const subject = getReminderEmailSubject(emailData);
      const html = generateReminderEmailHTML(emailData);

      // Send email
      try {
        const { data, error } = await resend.emails.send({
          from: `${org.name} <devis@croissantdevis.app>`,
          to: [client.email],
          subject,
          html,
        });

        if (error) throw new Error(error.message);

        // Mark reminder as sent
        await db
          .update(paymentReminders)
          .set({
            status: "sent",
            sentAt: now,
            emailSubject: subject,
          })
          .where(eq(paymentReminders.id, reminder.id));

        // Update invoice status to overdue if not already
        if (invoice.status === "sent") {
          await db
            .update(invoices)
            .set({ status: "overdue", updatedAt: now })
            .where(eq(invoices.id, invoice.id));
        }

        // Log activity
        await db.insert(quoteActivities).values({
          quoteId: invoice.quoteId ?? invoice.id, // fallback to invoice id if no quote
          userId: null,
          action: "payment_reminder_sent",
          metadata: JSON.stringify({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            reminderNumber: reminder.reminderNumber,
            daysOverdue,
            emailId: data?.id,
          }),
        });

        results.sent++;
      } catch (err) {
        console.error(`Failed to send reminder ${reminder.id}:`, err);
        await db
          .update(paymentReminders)
          .set({
            status: "failed",
            errorMessage: err instanceof Error ? err.message : "Unknown error",
          })
          .where(eq(paymentReminders.id, reminder.id));
        results.failed++;
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error("Payment reminders cron error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── Create pending reminders for invoices that need them ──
async function createPendingReminders(now: Date) {
  // Get all orgs with reminders enabled
  const orgsWithReminders = await db
    .select({
      id: organizations.id,
      reminderDay1: organizations.reminderDay1,
      reminderDay2: organizations.reminderDay2,
      reminderDay3: organizations.reminderDay3,
    })
    .from(organizations)
    .where(eq(organizations.remindersEnabled, true));

  for (const org of orgsWithReminders) {
    const day1 = org.reminderDay1 ?? 7;
    const day2 = org.reminderDay2 ?? 14;
    const day3 = org.reminderDay3 ?? 30;

    // Get sent/overdue invoices for this org
    const activeInvoices = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, org.id),
          inArray(invoices.status, ["sent", "overdue"]),
          isNull(invoices.paidAt),
          isNull(invoices.cancelledAt)
        )
      );

    for (const invoice of activeInvoices) {
      const referenceDate = invoice.sentAt ?? invoice.createdAt;
      const daysSinceSent = Math.floor(
        (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine which reminders should exist
      const remindersToCreate: { number: number; scheduledAt: Date }[] = [];

      if (daysSinceSent >= day1) {
        const scheduledAt = new Date(referenceDate);
        scheduledAt.setDate(scheduledAt.getDate() + day1);
        remindersToCreate.push({ number: 1, scheduledAt });
      }
      if (daysSinceSent >= day2) {
        const scheduledAt = new Date(referenceDate);
        scheduledAt.setDate(scheduledAt.getDate() + day2);
        remindersToCreate.push({ number: 2, scheduledAt });
      }
      if (daysSinceSent >= day3) {
        const scheduledAt = new Date(referenceDate);
        scheduledAt.setDate(scheduledAt.getDate() + day3);
        remindersToCreate.push({ number: 3, scheduledAt });
      }

      // Check which reminders already exist
      const existingReminders = await db
        .select({ reminderNumber: paymentReminders.reminderNumber })
        .from(paymentReminders)
        .where(eq(paymentReminders.invoiceId, invoice.id));

      const existingNumbers = new Set(existingReminders.map((r) => r.reminderNumber));

      // Create missing reminders
      for (const reminder of remindersToCreate) {
        if (!existingNumbers.has(reminder.number)) {
          await db.insert(paymentReminders).values({
            invoiceId: invoice.id,
            organizationId: org.id,
            reminderNumber: reminder.number,
            scheduledAt: reminder.scheduledAt,
            status: "pending",
          });
        }
      }
    }
  }
}
