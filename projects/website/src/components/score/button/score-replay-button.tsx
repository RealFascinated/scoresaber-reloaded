"use client";

import BeatSaberPepeLogo from "@/components/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import useDatabase from "@/hooks/use-database";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";
import { useLiveQuery } from "dexie-react-hooks";

export function ScoreReplayButton({ additionalData }: { additionalData: AdditionalScoreData }) {
  const database = useDatabase();
  const viewer = useLiveQuery(async () => database.getReplayViewer());

  if (!viewer) {
    return null;
  }

  return (
    <ScoreButton
      href={viewer.generateUrl(
        additionalData.scoreId,
        getBeatLeaderReplayRedirectUrl(additionalData)
      )}
      tooltip={<p>Click to view the score replay!</p>}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
