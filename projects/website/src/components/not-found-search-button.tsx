"use client";

import PlayerSearch from "@/components/player/player-search";
import { Button } from "@/components/ui/button";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const searchButtonClassName =
  "border-primary/30 bg-primary/5 text-primary hover:border-primary/50 hover:bg-primary/10 group relative h-12 overflow-hidden rounded-xl border-2 px-8 backdrop-blur-xs transition-all duration-300";

export function NotFoundSearchButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handlePlayerSelect = (player: ScoreSaberPlayer) => {
    router.push(`/player/${player.id}`);
  };

  return (
    <>
      <Button size="lg" variant="outline" className={searchButtonClassName} onClick={() => setIsOpen(true)}>
        <div className="from-primary/10 to-accent-secondary/10 absolute inset-0 bg-linear-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <SearchIcon className="relative z-10 mr-2 h-5 w-5" />
        <span className="relative z-10 font-semibold">Search Players</span>
      </Button>
      <PlayerSearch
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        onPlayerSelect={handlePlayerSelect}
        placeholder="Search for a player..."
      />
    </>
  );
}
