"use client";

import { authClient } from "@ssr/common/auth/auth-client";

export default function LoggedOut({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  // No session, show children
  if (!session) {
    return children;
  }

  // Session found
  return null;
}
