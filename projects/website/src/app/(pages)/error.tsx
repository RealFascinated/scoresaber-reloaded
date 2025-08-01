"use client";

import SimpleLink from "@/components/simple-link";
import { DiscordButton } from "@/components/social/discord-button";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";

export default function Error() {
  return (
    <div className="mt-10 flex w-full flex-col items-center text-center">
      <GlobeAmericasIcon className="h-24 w-24 text-red-500" />
      <h1 className="mt-6 text-4xl font-bold text-gray-200">Oops! Something went wrong.</h1>
      <p className="mt-2 text-lg text-gray-400">
        The error has been logged to your console. Please report this to a developer in our Discord.
      </p>

      <div className="mt-6 flex flex-col items-center gap-2">
        <SimpleLink href="/" className="text-primary hover:underline">
          Go back to the homepage
        </SimpleLink>

        <DiscordButton />
      </div>
    </div>
  );
}
