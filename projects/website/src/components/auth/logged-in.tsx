"use client";

import { authClient } from "@ssr/common/auth/auth-client";

export default function LoggedIn({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  // No session, show nothing
  if (!session) {
    return null;
  }

  // Session found
  return children;
}
