import { auth } from "@/server/auth";
import { db } from "@/db";
import { headers } from "next/headers";

export async function createContext() {
  const headersList = await headers();
  const session = await auth.api.getSession({
    headers: headersList,
  });

  // Extract organizationId from session (set during login/org selection)
  const organizationId = session?.session?.activeOrganizationId ?? null;

  return {
    db,
    session,
    organizationId,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
