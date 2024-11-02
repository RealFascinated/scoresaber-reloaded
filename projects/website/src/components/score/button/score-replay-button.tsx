import BeatSaberPepeLogo from "@/components/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { Config } from "@ssr/common/config";
import { getMinioBucketName, MinioBucket } from "@ssr/common/minio-buckets";

type ScoreReplayButton = {
  additionalData: AdditionalScoreData;
};

export function ScoreReplayButton({ additionalData }: ScoreReplayButton) {
  const path = additionalData.cachedReplayId
    ? `?link=${Config.cdnUrl}/${getMinioBucketName(MinioBucket.BeatLeaderReplays)}/${additionalData.cachedReplayId}`
    : `?scoreId=${additionalData.scoreId}`;

  return (
    <ScoreButton
      onClick={() => {
        window.open(`https://replay.beatleader.xyz/${path}`, "_blank");
      }}
      tooltip={<p>Click to view the score replay!</p>}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
