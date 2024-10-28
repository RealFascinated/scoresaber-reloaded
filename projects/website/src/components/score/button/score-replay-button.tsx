import BeatSaberPepeLogo from "@/components/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";

type ScoreReplayButton = {
  additionalData: AdditionalScoreData;
};

export function ScoreReplayButton({ additionalData }: ScoreReplayButton) {
  return (
    <ScoreButton
      onClick={() => {
        window.open(`https://replay.beatleader.xyz/?scoreId=${additionalData.scoreId}`, "_blank");
      }}
      tooltip={<p>Click to view the score replay!</p>}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
