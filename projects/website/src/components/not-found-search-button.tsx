"use client";

import PlayerSearch from "@/components/player/player-search";
import { Button } from "@/components/ui/button";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function NotFoundSearchButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handlePlayerSelect = (player: ScoreSaberPlayer) => {
    router.push(`/player/${player.id}`);
  };

  return (
    <>
      <Button variant="outline" onClick={() => setIsOpen(true)}>
        <SearchIcon className="mr-2 h-4 w-4" />
        Search Players
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
