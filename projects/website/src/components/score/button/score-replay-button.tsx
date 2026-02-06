"use client";

import BeatSaberPepeLogo from "@/components/logos/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";

export function ScoreReplayButton({ score }: { score: ScoreSaberScore }) {
  const database = useDatabase();
  const viewer = useStableLiveQuery(async () => database.getReplayViewer());

  if (!viewer || !score.beatLeaderScore) {
    return null;
  }

  return (
    <ScoreButton
      href={viewer.generateUrl(score.beatLeaderScore.scoreId, getBeatLeaderReplayRedirectUrl(score))}
      tooltip={<p>Click to view the score replay!</p>}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
