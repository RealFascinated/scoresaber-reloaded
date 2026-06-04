"use client";

import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { SharedIcons } from "@/shared-icons";

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
