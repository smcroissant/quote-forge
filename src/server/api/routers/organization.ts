import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, or, gt, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { router, protectedProcedure } from "../trpc";
import {
  organizations,
  organizationMembers,
  organizationInvitations,
  users,
} from "@/db/schema";
import { resend, FROM_EMAIL } from "@/lib/email/client";
import {
  generateInvitationEmailHTML,
  generateInvitationEmailSubject,
} from "@/lib/email/invitation-template";

// ── Plan limits ──────────────────────────────────────
const PLAN_MEMBER_LIMITS: Record<string, number> = {
  free: 1,
  pro: 1,
  team: 5,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

export const organizationRouter = router({
  // ── Get current org settings ──────────────────────
  get: protectedProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId!))
      .limit(1);

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organisation introuvable" });
    }

    return org;
  }),

  // ── Update general info ───────────────────────────
  updateInfo: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Le nom est requis").optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        country: z.string().optional(),
        website: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return updated;
    }),

  // ── Update billing settings ───────────────────────
  updateBilling: protectedProcedure
    .input(
      z.object({
        currency: z.string().optional(),
        taxRate: z.string().or(z.number()).transform(String).optional(),
        taxEnabled: z.boolean().optional(),
        quotePrefix: z.string().optional(),
        nextQuoteNumber: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return updated;
    }),

  // ── Update bank details ───────────────────────────
  updateBank: protectedProcedure
    .input(
      z.object({
        bankName: z.string().nullable().optional(),
        bankIban: z.string().nullable().optional(),
        bankBic: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return updated;
    }),

  // ── Update logo URL ───────────────────────────────
  updateLogo: protectedProcedure
    .input(z.object({ logo: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ logo: input.logo, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return updated;
    }),

  // ── Update branding (color, font, footer) ─────────
  updateBranding: protectedProcedure
    .input(
      z.object({
        primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        fontFamily: z.enum(["inter", "georgia", "arial"]).optional(),
        customFooter: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return updated;
    }),

  // ── Team Management ────────────────────────────────

  // List members of current org
  listMembers: protectedProcedure.query(async ({ ctx }) => {
    const members = await ctx.db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
      })
      .from(organizationMembers)
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, ctx.organizationId!))
      .orderBy(desc(organizationMembers.createdAt));

    return members;
  }),

  // List pending invitations
  listInvitations: protectedProcedure.query(async ({ ctx }) => {
    const invitations = await ctx.db
      .select({
        id: organizationInvitations.id,
        email: organizationInvitations.email,
        role: organizationInvitations.role,
        status: organizationInvitations.status,
        expiresAt: organizationInvitations.expiresAt,
        createdAt: organizationInvitations.createdAt,
        invitedByName: users.name,
      })
      .from(organizationInvitations)
      .leftJoin(users, eq(organizationInvitations.invitedBy, users.id))
      .where(
        and(
          eq(organizationInvitations.organizationId, ctx.organizationId!),
          eq(organizationInvitations.status, "pending")
        )
      )
      .orderBy(desc(organizationInvitations.createdAt));

    return invitations;
  }),

  // Invite a member by email
  inviteMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email("Email invalide"),
        role: z.enum(["admin", "member"]).default("member"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId!;
      const userId = ctx.session!.user.id;

      // Check if inviter is owner or admin
      const [inviterMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, orgId),
            eq(organizationMembers.userId, userId)
          )
        )
        .limit(1);

      if (
        !inviterMember ||
        (inviterMember.role !== "owner" && inviterMember.role !== "admin")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les propriétaires et administrateurs peuvent inviter des membres",
        });
      }

      // Check member limit (based on plan — default to "team" for now)
      const [org] = await ctx.db
        .select({ name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      const currentMembers = await ctx.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, orgId));

      // Default to "team" plan limit (5), can be made dynamic later
      const memberLimit = PLAN_MEMBER_LIMITS["team"];
      if (currentMembers.length >= memberLimit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Limite de ${memberLimit} membres atteinte pour votre plan`,
        });
      }

      // Check if already a member
      const existingUser = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existingUser[0]) {
        const alreadyMember = await ctx.db
          .select()
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, orgId),
              eq(organizationMembers.userId, existingUser[0].id)
            )
          )
          .limit(1);

        if (alreadyMember[0]) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Cet utilisateur est déjà membre de votre organisation",
          });
        }
      }

      // Check for existing pending invitation
      const existingInvite = await ctx.db
        .select()
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.organizationId, orgId),
            eq(organizationInvitations.email, input.email),
            eq(organizationInvitations.status, "pending"),
            gt(organizationInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (existingInvite[0]) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Une invitation est déjà en attente pour cet email",
        });
      }

      // Create invitation token
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const [invitation] = await ctx.db
        .insert(organizationInvitations)
        .values({
          organizationId: orgId,
          email: input.email,
          role: input.role,
          token,
          status: "pending",
          invitedBy: userId,
          expiresAt,
        })
        .returning();

      // Send invitation email
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quoteforge.app";
      const acceptLink = `${appUrl}/settings/team/accept?token=${token}`;

      const html = generateInvitationEmailHTML({
        inviteeEmail: input.email,
        orgName: org?.name ?? "votre organisation",
        inviterName: ctx.session!.user.name ?? "Un collègue",
        role: input.role,
        acceptLink,
      });

      const subject = generateInvitationEmailSubject(org?.name ?? "QuoteForge");

      try {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: [input.email],
          subject,
          html,
        });
      } catch (err) {
        console.error("Failed to send invitation email:", err);
        // Don't fail the invitation creation — email can be resent later
      }

      return invitation;
    }),

  // Accept invitation
  acceptInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [invitation] = await ctx.db
        .select()
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.token, input.token),
            eq(organizationInvitations.status, "pending"),
            gt(organizationInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation introuvable ou expirée",
        });
      }

      // Verify the email matches the current user
      if (invitation.email !== ctx.session!.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cette invitation n'est pas pour votre email",
        });
      }

      // Add member
      await ctx.db.insert(organizationMembers).values({
        organizationId: invitation.organizationId,
        userId: ctx.session!.user.id,
        role: invitation.role,
      });

      // Mark invitation as accepted
      await ctx.db
        .update(organizationInvitations)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(eq(organizationInvitations.id, invitation.id));

      // Set active organization
      await ctx.db
        .update(users)
        .set({ updatedAt: new Date() })
        .where(eq(users.id, ctx.session!.user.id));

      return { organizationId: invitation.organizationId };
    }),

  // Reject invitation
  rejectInvitation: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [invitation] = await ctx.db
        .select()
        .from(organizationInvitations)
        .where(
          and(
            eq(organizationInvitations.token, input.token),
            eq(organizationInvitations.status, "pending"),
            gt(organizationInvitations.expiresAt, new Date())
          )
        )
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation introuvable ou expirée",
        });
      }

      await ctx.db
        .update(organizationInvitations)
        .set({ status: "rejected" })
        .where(eq(organizationInvitations.id, invitation.id));

      return { success: true };
    }),

  // Cancel invitation (owner/admin only)
  cancelInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [invitation] = await ctx.db
        .select()
        .from(organizationInvitations)
        .where(eq(organizationInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation introuvable",
        });
      }

      if (invitation.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invitation hors de votre organisation",
        });
      }

      await ctx.db
        .update(organizationInvitations)
        .set({ status: "cancelled" })
        .where(eq(organizationInvitations.id, input.invitationId));

      return { success: true };
    }),

  // Remove member (owner/admin only, can't remove owner)
  removeMember: protectedProcedure
    .input(z.object({ memberId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [removerMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organizationId!),
            eq(organizationMembers.userId, ctx.session!.user.id)
          )
        )
        .limit(1);

      if (
        !removerMember ||
        (removerMember.role !== "owner" && removerMember.role !== "admin")
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seuls les propriétaires et administrateurs peuvent retirer des membres",
        });
      }

      const [targetMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.id, input.memberId))
        .limit(1);

      if (!targetMember) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membre introuvable",
        });
      }

      if (targetMember.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Impossible de retirer le propriétaire",
        });
      }

      // Admin can't remove another admin
      if (removerMember.role === "admin" && targetMember.role === "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Un administrateur ne peut pas retirer un autre administrateur",
        });
      }

      await ctx.db
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, input.memberId));

      return { success: true };
    }),

  // Update member role (owner only)
  updateMemberRole: protectedProcedure
    .input(
      z.object({
        memberId: z.string().uuid(),
        role: z.enum(["admin", "member"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [callerMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(
          and(
            eq(organizationMembers.organizationId, ctx.organizationId!),
            eq(organizationMembers.userId, ctx.session!.user.id)
          )
        )
        .limit(1);

      if (!callerMember || callerMember.role !== "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Seul le propriétaire peut changer les rôles",
        });
      }

      const [targetMember] = await ctx.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.id, input.memberId))
        .limit(1);

      if (!targetMember || targetMember.organizationId !== ctx.organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Membre introuvable",
        });
      }

      if (targetMember.role === "owner") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Impossible de modifier le rôle du propriétaire",
        });
      }

      await ctx.db
        .update(organizationMembers)
        .set({ role: input.role })
        .where(eq(organizationMembers.id, input.memberId));

      return { success: true };
    }),

  // Get invitation by token (for the accept page)
  getInvitationByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const [invitation] = await ctx.db
        .select({
          id: organizationInvitations.id,
          email: organizationInvitations.email,
          role: organizationInvitations.role,
          status: organizationInvitations.status,
          expiresAt: organizationInvitations.expiresAt,
          createdAt: organizationInvitations.createdAt,
          orgName: organizations.name,
          invitedByName: users.name,
        })
        .from(organizationInvitations)
        .leftJoin(
          organizations,
          eq(organizationInvitations.organizationId, organizations.id)
        )
        .leftJoin(users, eq(organizationInvitations.invitedBy, users.id))
        .where(eq(organizationInvitations.token, input.token))
        .limit(1);

      if (!invitation) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invitation introuvable",
        });
      }

      return invitation;
    }),
});
