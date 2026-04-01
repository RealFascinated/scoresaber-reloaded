import { MapCheckButton } from "@/components/leaderboard/button/map-check-button";
import { MapPreviewButton } from "@/components/leaderboard/button/map-preview-button";
import { OneClickInstallButton } from "@/components/leaderboard/button/one-click-install-button";
import { BeatSaverMapButton } from "@/components/score/button/beat-saver-map-button";
import { ScoreCopyBsrButton } from "@/components/score/button/score-copy-bsr-button";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import LeaderboardPpChartButton from "./chart/leaderboard-pp-chart";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
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
];

export default function LeaderboardButtons({ leaderboard, beatSaverMap }: Props) {
  return (
    <div className={`flex items-center justify-center gap-1`}>
      {buttons.map((button, index) => {
        const { render } = button;

        const buttonElement = render({
          leaderboard,
          beatSaverMap,
        });

        if (buttonElement == null) {
          return null;
        }
        return <div key={`leaderboard-btn-${index}`}>{buttonElement}</div>;
      })}
    </div>
  );
}
