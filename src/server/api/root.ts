import { router } from "./trpc";
import { productsRouter } from "./routers/products";
import { categoriesRouter } from "./routers/categories";
import { clientsRouter } from "./routers/clients";
import { quotesRouter } from "./routers/quotes";

export const appRouter = router({
  products: productsRouter,
  categories: categoriesRouter,
  clients: clientsRouter,
  quotes: quotesRouter,
});

export type AppRouter = typeof appRouter;
