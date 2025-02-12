"use client"; // Error components must be Client Components

import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { DiscordButton } from "@/components/social/discord-button";
import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center mt-10 text-center w-full">
      <GlobeAmericasIcon className="h-24 w-24 text-red-500" />
      <h1 className="text-4xl font-bold text-gray-200 mt-6">Oops! Something went wrong.</h1>
      <p className="text-lg text-gray-400 mt-2">
        The error has been logged to your console. Please report this to a developer in our Discord.
      </p>

      <div className="flex flex-col gap-2 mt-6 items-center">
        <Link prefetch={false} href="/" className="text-blue-500 hover:underline">
          Go back to the homepage
        </Link>

        <DiscordButton />
      </div>
    </div>
  );
}
