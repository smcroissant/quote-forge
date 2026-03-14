import { router } from "./trpc";
import { productsRouter } from "./routers/products";
import { categoriesRouter } from "./routers/categories";
import { clientsRouter } from "./routers/clients";
import { quotesRouter } from "./routers/quotes";
import { quoteTemplatesRouter } from "./routers/quote-templates";
import { invoicesRouter } from "./routers/invoices";
import { organizationRouter } from "./routers/organization";
import { paymentRemindersRouter } from "./routers/payment-reminders";
import { dashboardRouter } from "./routers/dashboard";

export const appRouter = router({
  products: productsRouter,
  categories: categoriesRouter,
  clients: clientsRouter,
  quotes: quotesRouter,
  quoteTemplates: quoteTemplatesRouter,
  invoices: invoicesRouter,
  organization: organizationRouter,
  paymentReminders: paymentRemindersRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
