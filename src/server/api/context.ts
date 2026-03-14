import { auth } from "@/server/auth";
import { db } from "@/db";
import { headers } from "next/headers";

export async function createContext() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  // OrganizationId may be null for unauthenticated users or users without an active org
  const organizationId = session?.session?.activeOrganizationId ?? null;

  return {
    db,
    session,
    organizationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

// Helper type for protected procedures where org is guaranteed
export type ProtectedContext = Omit<Context, "organizationId"> & {
  organizationId: string;
};
