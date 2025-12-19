import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { EyeIcon } from "lucide-react";

type MapCheckButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function MapCheckButton({ beatSaverMap }: MapCheckButtonProps) {
  return (
    <ScoreButton
      href={`https://kivalevan.me/BeatSaber-MapCheck/?id=${beatSaverMap.bsr}`}
      tooltip={<p>Click to check the map</p>}
    >
      <EyeIcon className="h-5 w-5" />
    </ScoreButton>
  );
}
