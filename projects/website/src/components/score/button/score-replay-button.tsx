"use client";

import BeatSaberPepeLogo from "@/components/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import useDatabase from "@/hooks/use-database";
import { Config } from "@ssr/common/config";
import { getMinioBucketName, MinioBucket } from "@ssr/common/minio-buckets";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { useLiveQuery } from "dexie-react-hooks";

type ScoreReplayButton = {
  additionalData: AdditionalScoreData;
};

export function ScoreReplayButton({ additionalData }: ScoreReplayButton) {
  const database = useDatabase();
  const viewer = useLiveQuery(async () => database.getReplayViewer());

  if (!viewer) {
    return null;
  }

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
