"use client";

import { cn } from "@/common/utils";
import { useHydrated } from "@/hooks/use-hydrated";
import Image from "next/image";

export function PlayerAvatar({
  profilePicture,
  name,
  className,
  deferred = false,
}: {
  profilePicture: string;
  name: string;
  className?: string;
  /**
   * Hold the image back until the page has hydrated. Long lists (rankings) have dozens of avatars, and on
   * a slow connection their downloads compete with the scripts that make the page interactive, so rows
   * below the fold wait for the scripts to finish first.
   */
  deferred?: boolean;
}) {
  const hydrated = useHydrated();
  const showImage = hydrated || !deferred;

  return (
    <div className={className}>
      {showImage ? (
        <Image
          src={profilePicture}
          alt={name}
          width={28}
          height={28}
          className={cn("border-border size-7 min-w-7 rounded-full border object-cover", className)}
        />
      ) : (
        <div className="border-border bg-muted size-7 min-w-7 rounded-full border" />
      )}
    </div>
  );
}
