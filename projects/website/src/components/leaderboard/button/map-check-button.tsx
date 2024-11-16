import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { EyeIcon } from "lucide-react";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

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
