"use client";

import BeatSaberPepeLogo from "@/components/logos/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";

export function ScoreReplayButton({ score }: { score: BeatLeaderScore | undefined }) {
  const database = useDatabase();
  const viewer = useStableLiveQuery(async () => database.getReplayViewer());

  if (!viewer || !score) {
    return null;
  }

  return (
    <ScoreButton
      href={viewer.generateUrl(score.scoreId, getBeatLeaderReplayRedirectUrl(score))}
      tooltip={<p>Click to view the score replay!</p>}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
