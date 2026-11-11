"use client";

import { signInWithSteam } from "@/common/auth/auth-api";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { toast } from "sonner";

interface SteamSignInRedirectProps {
  redirectPath: string;
  /** Set when Steam sent the user back with a failed sign-in. Auto-redirecting then could loop. */
  failed: boolean;
}

/**
 * Sends a signed-out visitor straight to Steam, returning them to `redirectPath` afterwards.
 */
export default function SteamSignInRedirect({ redirectPath, failed }: SteamSignInRedirectProps) {
  useEffect(() => {
    if (failed) {
      return;
    }
    signInWithSteam(redirectPath).catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
    });
  }, [failed, redirectPath]);

  if (failed) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive text-sm">Sign in failed, please try again.</p>
        <Button onClick={() => signInWithSteam(redirectPath)}>Sign in with Steam</Button>
      </div>
    );
  }

  return (
    <div className="text-muted-foreground flex h-[60vh] items-center justify-center">
      Redirecting to Steam…
    </div>
  );
}
