import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { PlayCircleIcon } from "lucide-react";

type MapPreviewButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function MapPreviewButton({ beatSaverMap }: MapPreviewButtonProps) {
  const difficulty = beatSaverMap.difficulty;
  if (!difficulty) {
    return null;
  }

  return (
    <ScoreButton
      href={`https://allpoland.github.io/ArcViewer/?id=${beatSaverMap.bsr}&difficulty=${difficulty.difficulty}&mode=${difficulty.characteristic}`}
      tooltip={<p>Click to view a preview of the map</p>}
      data-umami-event="map-preview-button"
    >
      <PlayCircleIcon className="h-5 w-5" />
    </ScoreButton>
  );
}
