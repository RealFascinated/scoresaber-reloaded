"use client";

import { useUserPreference } from "@/hooks/use-user-preferences";
import { ReplayViewers } from "@ssr/common/replay-viewer";

import BeatSaberPepeLogo from "@/components/logos/logos/beatsaber-pepe-logo";
import ScoreButton from "@/components/score/button/score-button";
import { BeatLeaderScore } from "@ssr/common/schemas/beatleader/score/score";
import { getBeatLeaderReplayRedirectUrl } from "@ssr/common/utils/beatleader-utils";

type ScoreReplayButtonProps = {
  score: BeatLeaderScore | undefined;
  /** The ScoreSaber score id, required by ChroViewer. */
  scoreSaberScoreId?: number;
  size?: number;
};

export function ScoreReplayButton({ score, scoreSaberScoreId, size = 28 }: ScoreReplayButtonProps) {
  const viewer = ReplayViewers[useUserPreference("replayViewer")];

  if (!viewer || !score) {
    return null;
  }

  const viewerScoreId = viewer.id === "chroviewer" ? scoreSaberScoreId : score.scoreId;
  if (viewerScoreId === undefined) {
    return null;
  }

  return (
    <ScoreButton
      href={viewer.generateUrl(viewerScoreId, getBeatLeaderReplayRedirectUrl(score))}
      tooltip={<p>Click to view the score replay!</p>}
      size={size}
    >
      <BeatSaberPepeLogo />
    </ScoreButton>
  );
}
