import { router } from "./trpc";
import { productsRouter } from "./routers/products";
import { categoriesRouter } from "./routers/categories";
import { clientsRouter } from "./routers/clients";
import { quotesRouter } from "./routers/quotes";
import { organizationRouter } from "./routers/organization";

export const appRouter = router({
  products: productsRouter,
  categories: categoriesRouter,
  clients: clientsRouter,
  quotes: quotesRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
