"use client";

import Card from "@/components/card";
import { DiscordButton } from "@/components/social/discord-button";
import { Button } from "@/components/ui/button";
import { Frown, HomeIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  const errorMessage = error.message || "An unexpected error occurred";
  return (
    <div className="flex w-full justify-center">
      <Card className="mt-2 flex w-full max-w-2xl flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-red-400">
            Something went wrong <Frown className="size-6" />
          </h1>
          <p className="text-muted-foreground text-lg">{errorMessage}</p>
        </div>

        {/* Error Details */}
        <div className="w-full">
          <div className="border-border bg-muted/50 mt-2 rounded-lg border p-4 text-left">
            <div className="space-y-2">
              {error.message && (
                <div>
                  <span className="text-muted-foreground text-sm font-semibold">Message:</span>
                  <p className="font-mono text-sm wrap-break-word">{error.message}</p>
                </div>
              )}
              {error.stack && (
                <div>
                  <span className="text-muted-foreground text-sm font-semibold">Stack Trace:</span>
                  <pre className="text-muted-foreground bg-background/50 mt-2 max-h-64 overflow-auto rounded p-2 text-xs">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              <HomeIcon className="h-4 w-4" />
              Go back to homepage
            </Button>
          </Link>
        </div>

        {/* Discord Support */}
        <div className="border-border flex flex-col items-center gap-2 border-t pt-3">
          <p className="text-muted-foreground text-sm">Need help? Join our Discord community!</p>
          <DiscordButton />
        </div>
      </Card>
    </div>
  );
}
