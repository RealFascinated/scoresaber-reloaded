"use client";

import BeatSaberPepeLogo from "@/components/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import * as React from "react";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { Config } from "@ssr/common/config";
import { getMinioBucketName, MinioBucket } from "@ssr/common/minio-buckets";
import useSettings from "@/hooks/use-settings";

type ScoreReplayButton = {
  additionalData: AdditionalScoreData;
};

export function ScoreReplayButton({ additionalData }: ScoreReplayButton) {
  const settings = useSettings();
  if (!settings) {
    return null;
  }
  const viewer = settings.getReplayViewer();

  return (
    <ScoreButton
      href={viewer.generateUrl(
        additionalData.scoreId,
        additionalData.cachedReplayId
          ? `?link=${Config.cdnUrl}/${getMinioBucketName(MinioBucket.BeatLeaderReplays)}/${additionalData.cachedReplayId}`
          : undefined
      )}
      tooltip={<p>Click to view the score replay!</p>}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
