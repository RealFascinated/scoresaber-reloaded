"use client";

import ScoreButton from "@/components/score/button/score-button";
import { usePinnedScoreActions } from "@/hooks/use-pinned-scores";
import { SharedIcons } from "@/shared-icons";
import { SHARED_CONSTS } from "@ssr/common/shared-consts";
import { toast } from "sonner";

export default function ScorePinButton({ scoreId }: { scoreId: number }) {
  const { pinnedScoreIds, pin, unpin } = usePinnedScoreActions();
  const isPinned = pinnedScoreIds.includes(scoreId);

  function togglePinned() {
    if (isPinned) {
      unpin(scoreId);
      return;
    }

    if (pin(scoreId) === "limit-reached") {
      toast.error(`You can only pin a maximum of ${SHARED_CONSTS.maxPinnedScores} scores.`);
    }
  }

  return (
    <ScoreButton
      onClick={togglePinned}
      tooltip={<p>{isPinned ? "Unpin this score from your profile" : "Pin this score to your profile"}</p>}
    >
      {isPinned ? (
        <SharedIcons.UnpinScoreIcon className="size-4" />
      ) : (
        <SharedIcons.PinScoreIcon className="size-4" />
      )}
    </ScoreButton>
  );
}
