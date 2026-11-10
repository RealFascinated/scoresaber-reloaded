"use client";

import PlayerAndLeaderboardSearch from "@/components/navbar/player-and-leaderboard-search";
import SimpleLink from "@/components/simple-link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Image from "next/image";

/**
 * Slim top bar. On mobile (where the sidebar is hidden) it carries the logo and a
 * search shortcut; on desktop it only holds the sidebar toggle.
 */
export function AppHeader() {
  return (
    <header className="bg-background/80 sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 px-3 backdrop-blur md:h-10 md:bg-transparent md:backdrop-blur-none">
      <SidebarTrigger className="-ml-1" />
      <SimpleLink href="/" className="flex items-center gap-2 md:hidden" draggable={false}>
        <Image
          width={24}
          height={24}
          className="size-6"
          src="/assets/logos/scoresaber.png"
          alt="ScoreSaber Logo"
        />
        <span className="text-sm font-semibold">SSR</span>
      </SimpleLink>
      <div className="ml-auto md:hidden">
        <PlayerAndLeaderboardSearch variant="icon" />
      </div>
    </header>
  );
}
