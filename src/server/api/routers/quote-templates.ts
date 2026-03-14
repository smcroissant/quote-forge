import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, isNull, or, asc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { quoteTemplates } from "@/db/schema";

// ── Input schemas ───────────────────────────────────
const createTemplateInput = z.object({
  name: z.string().min(1, "Le nom est requis").max(100),
  slug: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  layout: z.enum(["classic", "modern", "minimal"]).default("classic"),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#1a1a1a"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6"),
  fontFamily: z.string().default("system"),
  showLogo: z.boolean().default(true),
  showOrgDetails: z.boolean().default(true),
  showClientDetails: z.boolean().default(true),
  showNotes: z.boolean().default(true),
  showTerms: z.boolean().default(false),
  termsText: z.string().optional(),
  headerHtml: z.string().optional(),
  footerHtml: z.string().optional(),
  cssOverrides: z.string().optional(),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

const updateTemplateInput = createTemplateInput.partial().extend({
  id: z.string().uuid(),
});

// ── Router ──────────────────────────────────────────
export const quoteTemplatesRouter = router({
  // ── List all templates (defaults + org custom) ──
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const templates = await ctx.db
      .select()
      .from(quoteTemplates)
      .where(
        or(
          isNull(quoteTemplates.organizationId),
          eq(quoteTemplates.organizationId, ctx.organizationId)
        )
      )
      .orderBy(asc(quoteTemplates.sortOrder), asc(quoteTemplates.name));

    return templates;
  }),

  // ── Get single template ──────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .select()
        .from(quoteTemplates)
        .where(
          and(
            eq(quoteTemplates.id, input.id),
            or(
              isNull(quoteTemplates.organizationId),
              eq(quoteTemplates.organizationId, ctx.organizationId)
            )
          )
        )
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template introuvable" });
      }

      return template;
    }),

  // ── Create custom template ───────────────────────
  create: protectedProcedure
    .input(createTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const [template] = await ctx.db
        .insert(quoteTemplates)
        .values({
          ...input,
          organizationId: ctx.organizationId,
        })
        .returning();

      return template;
    }),

  // ── Update template ──────────────────────────────
  update: protectedProcedure
    .input(updateTemplateInput)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Check ownership (can't edit default templates)
      const [existing] = await ctx.db
        .select()
        .from(quoteTemplates)
        .where(
          and(
            eq(quoteTemplates.id, id),
            eq(quoteTemplates.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template introuvable ou non modifiable",
        });
      }

      const [updated] = await ctx.db
        .update(quoteTemplates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(quoteTemplates.id, id))
        .returning();

      return updated;
    }),

  // ── Delete template (custom only) ────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(quoteTemplates)
        .where(
          and(
            eq(quoteTemplates.id, input.id),
            eq(quoteTemplates.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template introuvable ou non supprimable",
        });
      }

      await ctx.db.delete(quoteTemplates).where(eq(quoteTemplates.id, input.id));

      return { success: true };
    }),

  // ── Duplicate a template ─────────────────────────
  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid(), name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [source] = await ctx.db
        .select()
        .from(quoteTemplates)
        .where(
          and(
            eq(quoteTemplates.id, input.id),
            or(
              isNull(quoteTemplates.organizationId),
              eq(quoteTemplates.organizationId, ctx.organizationId)
            )
          )
        )
        .limit(1);

      if (!source) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template source introuvable" });
      }

      const slug = input.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const [duplicate] = await ctx.db
        .insert(quoteTemplates)
        .values({
          organizationId: ctx.organizationId,
          name: input.name,
          slug,
          description: source.description,
          layout: source.layout,
          primaryColor: source.primaryColor,
          accentColor: source.accentColor,
          fontFamily: source.fontFamily,
          showLogo: source.showLogo,
          showOrgDetails: source.showOrgDetails,
          showClientDetails: source.showClientDetails,
          showNotes: source.showNotes,
          showTerms: source.showTerms,
          termsText: source.termsText,
          headerHtml: source.headerHtml,
          footerHtml: source.footerHtml,
          cssOverrides: source.cssOverrides,
          isDefault: false,
          sortOrder: source.sortOrder,
        })
        .returning();

      return duplicate;
    }),
});
