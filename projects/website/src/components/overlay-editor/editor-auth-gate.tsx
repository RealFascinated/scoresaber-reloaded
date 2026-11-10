"use client";

import { signInWithSteam } from "@/common/auth/auth-api";
import { Button } from "@/components/ui/button";
import useMe from "@/hooks/use-me";
import { ReactNode } from "react";

/**
 * Overlays belong to a user, so the editor needs someone signed in.
 */
export default function EditorAuthGate({ children }: { children: ReactNode }) {
  const { data: me, isLoading } = useMe();

  if (isLoading) {
    return <div className="text-muted-foreground flex h-screen items-center justify-center">Loading…</div>;
  }
  if (!me) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-xl font-semibold">Overlay editor</h1>
        <p className="text-muted-foreground text-sm">Sign in to create and save your overlays.</p>
        <Button onClick={() => signInWithSteam("/overlay/editor")}>Sign in with Steam</Button>
      </div>
    );
  }
  return <>{children}</>;
}
