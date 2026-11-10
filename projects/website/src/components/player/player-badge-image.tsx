"use client";

import { useHydrated } from "@/hooks/use-hydrated";
import Image from "next/image";

/**
 * Badges are animated GIFs hosted elsewhere and can weigh several hundred KB each. They sit below the player
 * header, so they load once the page has hydrated rather than competing with the scripts for bandwidth.
 */
export function PlayerBadgeImage({ url, description }: { url: string; description: string }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return <div className="h-[30px] w-20" />;
  }

  return <Image src={url} alt={description} width={80} height={30} />;
}
