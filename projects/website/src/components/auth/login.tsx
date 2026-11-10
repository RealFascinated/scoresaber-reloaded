"use client";

import { getSafeRedirectPath, signInWithSteam } from "@/common/auth/auth-api";
import { Button } from "@/components/ui/button";
import useMe from "@/hooks/use-me";
import { SharedIcons } from "@/shared-icons";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type LoginProvider = {
  id: string;
  name: string;
  description: string;
  signIn: (redirectPath: string) => Promise<void>;
};

/**
 * Every way to sign in. Add new providers here, this is the only login page.
 */
const LOGIN_PROVIDERS: LoginProvider[] = [
  {
    id: "steam",
    name: "Steam",
    description: "Sign in with your Steam account",
    signIn: signInWithSteam,
  },
];

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: me } = useMe();
  const [pendingProvider, setPendingProvider] = useState<string | undefined>();

  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"));
  // Set by the backend when a sign-in fails
  const error = searchParams.get("error");

  useEffect(() => {
    if (me) {
      router.replace(redirectPath);
    }
  }, [me, redirectPath, router]);

  async function handleSignIn(provider: LoginProvider) {
    setPendingProvider(provider.id);
    try {
      await provider.signIn(redirectPath);
    } catch (error) {
      setPendingProvider(undefined);
      toast.error(error instanceof Error ? error.message : "Failed to sign in");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-foreground text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Sign in to link your player profile. Your profile is verified with the account you sign in with.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="bg-destructive/10 border-destructive/50 text-destructive rounded-md border px-4 py-3 text-sm"
        >
          Sign in failed, please try again. <span className="opacity-70">({error})</span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {LOGIN_PROVIDERS.map(provider => (
          <Button
            key={provider.id}
            variant="outline"
            size="lg"
            className="h-auto justify-start gap-3 py-3"
            disabled={pendingProvider !== undefined}
            onClick={() => handleSignIn(provider)}
          >
            <SharedIcons.SignInIcon className="size-5 shrink-0" />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-medium">
                {pendingProvider === provider.id ? "Redirecting..." : `Continue with ${provider.name}`}
              </span>
              <span className="text-muted-foreground text-xs font-normal">{provider.description}</span>
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
