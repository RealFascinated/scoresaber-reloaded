import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { HandIcon } from "@radix-ui/react-icons";

type OneClickInstallButtonProps = {
  beatSaverMap: BeatSaverMapResponse;
};

export function OneClickInstallButton({ beatSaverMap }: OneClickInstallButtonProps) {
  return (
    <ScoreButton href={`beatsaver://${beatSaverMap.bsr}`} tooltip={<p>Click to install the map</p>}>
      <HandIcon className="h-4 w-4" />
    </ScoreButton>
  );
}
