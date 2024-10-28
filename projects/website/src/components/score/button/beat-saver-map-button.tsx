import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";

type BeatSaverMapProps = {
  beatSaverMap: BeatSaverMap;
};

export function BeatSaverMapButton({ beatSaverMap }: BeatSaverMapProps) {
  return (
    <ScoreButton
      onClick={() => {
        window.open(`https://beatsaver.com/maps/${beatSaverMap.bsr}`, "_blank");
      }}
      tooltip={<p>Click to open the map</p>}
    >
      <BeatSaverLogo />
    </ScoreButton>
  );
}
