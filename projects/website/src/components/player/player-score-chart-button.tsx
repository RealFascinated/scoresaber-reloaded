import PlayerScoreChart from "@/components/player/chart/player-score-chart";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import Tooltip from "../tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";

type PlayerStarCurveProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerScoreChartButton({ player }: PlayerStarCurveProps) {
  return (
    <Dialog>
      <DialogTrigger>
        <Tooltip
          side="bottom"
          className="cursor-pointer"
          display={
            <p>
              View the score chart for{" "}
              <span className="font-semibold">{truncateText(player.name, 16)}</span>
            </p>
          }
        >
          <StarIcon className="h-5 w-5" />
        </Tooltip>
      </DialogTrigger>
      <DialogContent className="max-w-5xl h-[600px] bg-secondary">
        <DialogHeader>
          <DialogTitle>Score Chart</DialogTitle>
          <DialogDescription>
            View the score chart for {truncateText(player.name, 16)}!
          </DialogDescription>
        </DialogHeader>

        <PlayerScoreChart player={player} />
      </DialogContent>
    </Dialog>
  );
}
