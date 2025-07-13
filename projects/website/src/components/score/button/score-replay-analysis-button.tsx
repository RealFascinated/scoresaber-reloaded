"use client";

import ScoreButton from "@/components/score/button/score-button";
import useDatabase from "@/hooks/use-database";
import { AdditionalScoreData } from "@ssr/common/model/additional-score-data/additional-score-data";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";
import { useLiveQuery } from "dexie-react-hooks";
import { BarChart3 } from "lucide-react";

export function ScoreReplayAnalysisButton({
  additionalData,
}: {
  additionalData: AdditionalScoreData;
}) {
  const database = useDatabase();
  const viewer = useLiveQuery(async () => database.getReplayViewer());

  if (!viewer) {
    return null;
  }

  return (
    <ScoreButton
      href={`/replay-analysis?replay=${additionalData.savedReplay ? getBeatLeaderReplayRedirectUrl(additionalData) : additionalData.scoreId}`}
      tooltip={<p>Click to view the score replay analysis!</p>}
    >
      <BarChart3 className="h-4 w-4" />
    </ScoreButton>
  );
}
