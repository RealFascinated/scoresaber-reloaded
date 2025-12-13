"use client";

import Card from "@/components/card";
import { Button } from "@/components/ui/button";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { HomeIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function Error() {
  return (
    <div className="flex w-full items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Background gradient effect */}
        <div className="from-destructive/5 via-primary/5 to-accent-secondary/5 absolute inset-0 rounded-xl bg-gradient-to-br blur-lg" />

        <Card className="border-destructive/30 relative w-full shadow-lg backdrop-blur-md">
          {/* Header */}
          <div className="pb-4 text-center">
            <h1 className="mb-2 bg-linear-to-r bg-clip-text text-2xl font-bold">
              Oops! Something went wrong
            </h1>
            <p className="text-muted-foreground mx-auto max-w-sm text-base leading-relaxed">
              The error has been logged to your console. Please report this to a developer in our
              Discord.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <Button
                asChild
                variant="default"
                className="h-10 w-full text-sm font-semibold shadow-md transition-colors duration-200 hover:shadow-lg"
              >
                <Link href="/" className="flex items-center justify-center gap-2">
                  <HomeIcon className="h-4 w-4" />
                  Go back to homepage
                </Link>
              </Button>

              <Button
                variant="outline"
                className="hover:border-primary/50 flex h-10 w-full items-center justify-center gap-2 border-2 text-sm font-semibold transition-colors duration-200"
                onClick={() => window.location.reload()}
              >
                <ArrowPathIcon className="h-4 w-4" />
                Try again
              </Button>
            </div>

            <div className="border-border border-t pt-3">
              <Button
                asChild
                className="h-10 w-full bg-[#5865F2] text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-[#5865F2]/85 hover:shadow-lg"
              >
                <Link
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
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
