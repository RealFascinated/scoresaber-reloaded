import PlayerScoreChart from "@/components/player/chart/player-score-chart";
import SimpleTooltip from "@/components/simple-tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { truncateText } from "@ssr/common/string-utils";
import { ChartLineIcon } from "lucide-react";
import PlayerActionButtonWrapper from "./player-action-button-wrapper";

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
        <SimpleTooltip
          side="top"
          className="cursor-pointer"
          display={
            <p>
              View the score chart for <b>{player.name}</b>
            </p>
          }
        >
          <PlayerActionButtonWrapper>
            <ChartLineIcon className="h-5 w-5" />
          </PlayerActionButtonWrapper>
        </SimpleTooltip>
      </DialogTrigger>
      <DialogContent className="max-w-5xl min-h-[640px] bg-secondary">
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
