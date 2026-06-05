"use client";

import ScoreButton from "@/components/score/button/score-button";
import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";

type ScoreInstallMapButtonProps = {
  beatSaverMap: BeatSaverMap;
};

export function ScoreInstallMapButton({ beatSaverMap }: ScoreInstallMapButtonProps) {
  return (
    <ScoreButton tooltip={<p>Click to install the map</p>} href={`beatsaver://${beatSaverMap.bsr}`}>
      <SharedIcons.InstallMapToGameIcon className="h-4 w-4" />
    </ScoreButton>
  );
}
