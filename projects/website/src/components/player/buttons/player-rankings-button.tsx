"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerMiniRankings from "../mini-ranking/player-mini-ranking";

interface PlayerRankingsButtonProps {
  player: ScoreSaberPlayer;
}

export default function PlayerRankingsButton({ player }: PlayerRankingsButtonProps) {
  // Don't show for inactive or banned players
  if (player.inactive || player.banned) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <SimpleTooltip
            display={
              <p>
                View <b>{player.name}</b>&apos;s rankings
              </p>
            }
          >
            <span className="cursor-pointer">Player Rankings</span>
          </SimpleTooltip>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Player Rankings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <PlayerMiniRankings player={player} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
