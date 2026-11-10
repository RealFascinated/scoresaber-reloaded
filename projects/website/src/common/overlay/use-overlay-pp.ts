import type { OverlayRuntime } from "@/common/overlay/overlay-runtime";
import { BeatLeaderCurve } from "@ssr/common/leaderboard-curve/beatleader-curve";
import { ScoreSaberCurve } from "@ssr/common/leaderboard-curve/scoresaber-curve";
import { useMemo } from "react";

/** The pp of the score being played, undefined when the map doesn't give pp or there is no score. */
export type OverlayScorePp = { scoreSaber: number | undefined; beatLeader: number | undefined };

/**
 * Calculates the pp the current score is worth right now. It is what the score would be worth if it ended now.
 * Modifiers aren't known to the overlay, so they aren't part of it.
 */
export function useOverlayScorePp({
  data,
  ratings,
}: Pick<OverlayRuntime, "data" | "ratings">): OverlayScorePp {
  const calculateBeatLeader = useMemo(
    () => (ratings?.ranked ? BeatLeaderCurve.createCalculator(ratings) : undefined),
    [ratings]
  );

  const accuracy = data.score?.accuracy;
  const leaderboard = data.map?.leaderboard;
  if (accuracy === undefined) {
    return { scoreSaber: undefined, beatLeader: undefined };
  }
  return {
    scoreSaber:
      leaderboard?.ranked && leaderboard.stars > 0
        ? ScoreSaberCurve.getPp(leaderboard.stars, accuracy)
        : undefined,
    beatLeader: calculateBeatLeader?.(accuracy / 100),
  };
}
