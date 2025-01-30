import { StarIcon } from "@heroicons/react/24/solid";
import Tooltip from "../tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import PlayerStarCurveGraph from "@/components/player/chart/player-star-curve-graph";
import { truncateText } from "@ssr/common/string-utils";
import React from "react";

type PlayerStarCurveProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerStarCurveButton({ player }: PlayerStarCurveProps) {
  return (
    <Dialog>
      <DialogTrigger>
        <Tooltip
          side="bottom"
          className="cursor-pointer"
          display={
            <p>
              View the star curve for <span className="font-semibold">{truncateText(player.name, 16)}</span>
            </p>
          }
        >
          <StarIcon className="h-5 w-5" />
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[600px] bg-secondary">
        <DialogHeader>
          <DialogTitle>Star Curve</DialogTitle>
          <DialogDescription>View the star curve for {truncateText(player.name, 16)}!</DialogDescription>
        </DialogHeader>

        <PlayerStarCurveGraph player={player} />
      </DialogContent>
    </Dialog>
  );
}
