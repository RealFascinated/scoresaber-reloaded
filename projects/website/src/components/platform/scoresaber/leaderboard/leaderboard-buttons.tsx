import { MapCheckButton } from "@/components/leaderboard/button/map-check-button";
import { MapPreviewButton } from "@/components/leaderboard/button/map-preview-button";
import { OneClickInstallButton } from "@/components/leaderboard/button/one-click-install-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { LeaderboardStarChange } from "@ssr/common/schemas/leaderboard/leaderboard-star-change";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { StarIcon } from "lucide-react";
import ScoreButton from "../../../score/button/score-button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "../../../ui/dialog";
import LeaderboardPpChartButton from "./chart/leaderboard-pp-chart";
import { LeaderboardStarChangeHistory } from "./leaderboard-star-change-history";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  starChangeHistory: LeaderboardStarChange[] | undefined;
  beatSaverMap?: BeatSaverMap;
};

const buttons = [
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <ScoreCopyBsrButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <BeatSaverMapButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ leaderboard, beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <MapPreviewButton leaderboard={leaderboard} beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <MapCheckButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ beatSaverMap }: Props) => {
      if (!beatSaverMap) {
        return null;
      }
      return <OneClickInstallButton beatSaverMap={beatSaverMap} />;
    },
  },
  {
    render: ({ leaderboard }: Props) => {
      if (!leaderboard.ranked) {
        return null;
      }
      return <LeaderboardPpChartButton leaderboard={leaderboard} />;
    },
  },
  {
    render: ({ leaderboard, starChangeHistory }: Props) => {
      if (!leaderboard.ranked || !starChangeHistory) {
        return null;
      }
      return (
        <Dialog>
          <DialogTrigger asChild>
            <ScoreButton tooltip={<p>View Star History Graph</p>}>
              <StarIcon className="h-4 w-4" />
            </ScoreButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl">
            <DialogTitle>Star History</DialogTitle>
            <LeaderboardStarChangeHistory starChangeHistory={starChangeHistory} />
          </DialogContent>
        </Dialog>
      );
    },
  },
];

export default function LeaderboardButtons({ leaderboard, beatSaverMap, starChangeHistory }: Props) {
  return (
    <div className={`flex items-center justify-center gap-1`}>
      {buttons.map((button, index) => {
        const { render } = button;

        const buttonElement = render({
          leaderboard,
          beatSaverMap,
          starChangeHistory,
        });

        if (buttonElement == null) {
          return null;
        }
        return <div key={`leaderboard-btn-${index}`}>{buttonElement}</div>;
      })}
    </div>
  );
}
