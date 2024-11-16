import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { PlayCircleIcon } from "lucide-react";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

type MapPreviewButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function MapPreviewButton({ beatSaverMap }: MapPreviewButtonProps) {
  const difficulty = beatSaverMap.difficulty;
  return (
    <ScoreButton
      href={`https://allpoland.github.io/ArcViewer/?id=${beatSaverMap.bsr}&difficulty=${difficulty.difficulty}&mode=${difficulty.characteristic}`}
      tooltip={<p>Click to view a preview of the map</p>}
    >
      <PlayCircleIcon className="h-5 w-5" />
    </ScoreButton>
  );
}
