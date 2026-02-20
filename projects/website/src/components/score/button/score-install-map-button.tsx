"use client";

import ScoreButton from "@/components/score/button/score-button";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { CloudDownloadIcon } from "lucide-react";

type ScoreInstallMapButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function ScoreInstallMapButton({ beatSaverMap }: ScoreInstallMapButtonProps) {
  return (
    <ScoreButton tooltip={<p>Click to install the map</p>} href={`beatsaver://${beatSaverMap.bsr}`}>
      <CloudDownloadIcon className="h-4 w-4" />
    </ScoreButton>
  );
}
