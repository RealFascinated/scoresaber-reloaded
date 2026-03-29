import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { PlayCircleIcon } from "lucide-react";

type MapPreviewButtonProps = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap: BeatSaverMapResponse;
};

export function MapPreviewButton({ leaderboard, beatSaverMap }: MapPreviewButtonProps) {
  return (
    <ScoreButton
      href={`https://allpoland.github.io/ArcViewer/?id=${beatSaverMap.bsr}&difficulty=${leaderboard.difficulty.difficulty}&mode=${leaderboard.difficulty.characteristic}`}
      tooltip={<p>Click to view a preview of the map</p>}
    >
      <PlayCircleIcon className="h-5 w-5" />
    </ScoreButton>
  );
}
