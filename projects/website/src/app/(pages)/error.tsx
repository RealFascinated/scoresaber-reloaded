"use client";

import SimpleLink from "@/components/simple-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { BoltIcon, ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import { HomeIcon } from "lucide-react";
import Image from "next/image";

export default function Error() {
  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Background gradient effect */}
        <div className="from-destructive/5 via-primary/5 to-accent-secondary/5 absolute inset-0 rounded-xl bg-gradient-to-br blur-lg" />

        <Card className="border-destructive/30 bg-card/80 relative w-full shadow-lg backdrop-blur-md">
          <CardHeader className="pb-6 text-center">
            {/* Animated icon with gradient background */}
            <div className="relative mx-auto mb-4">
              <div className="from-destructive/20 to-primary/20 absolute inset-0 animate-pulse rounded-full bg-gradient-to-br blur-md" />
              <div className="from-destructive/10 to-primary/10 border-destructive/20 relative flex h-16 w-16 items-center justify-center rounded-full border bg-gradient-to-br">
                <ExclamationTriangleIcon className="text-destructive h-8 w-8 animate-bounce drop-shadow-lg" />
                <div className="absolute -right-0.5 -top-0.5">
                  <BoltIcon className="h-4 w-4 animate-ping text-yellow-500" />
                </div>
              </div>
            </div>

            <CardTitle className="from-foreground to-muted-foreground bg-linear-to-r mb-2 bg-clip-text text-2xl font-bold text-transparent">
              Oops! Something went wrong
            </CardTitle>
            <CardDescription className="text-muted-foreground mx-auto max-w-sm text-base leading-relaxed">
              The error has been logged to your console. Please report this to a developer in our
              Discord.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pb-6">
            <div className="flex flex-col gap-3">
              <Button
                asChild
                variant="default"
                className="h-10 w-full text-sm font-semibold shadow-md transition-all duration-300 hover:shadow-lg"
              >
                <SimpleLink href="/" className="flex items-center justify-center gap-2">
                  <HomeIcon className="h-4 w-4" />
                  Go back to homepage
                </SimpleLink>
              </Button>

              <Button
                variant="outline"
                className="hover:border-primary/50 flex h-10 w-full items-center justify-center gap-2 border-2 text-sm font-semibold transition-all duration-300"
                onClick={() => window.location.reload()}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Try again
              </Button>
            </div>

            <div className="border-border/50 border-t pt-3">
              <Button
                asChild
                className="h-10 w-full bg-[#5865F2] text-sm font-semibold text-white shadow-md transition-all duration-300 hover:bg-[#5865F2]/85 hover:shadow-lg"
              >
                <SimpleLink
                  href="https://discord.gg/kmNfWGA4A8"
                  target="_blank"
                  className="flex items-center justify-center gap-2"
                >
                  <Image
                    className="h-4 w-4"
                    src="https://cdn.fascinated.cc/assets/logos/discord.svg"
                    alt="Discord Logo"
                    width={16}
                    height={16}
                  />
                  Join our Discord
                </SimpleLink>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
