"use client";

import { usePlayerPinnedScores } from "@/hooks/use-pinned-scores";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberScoreDisplay from "./score/scoresaber-score";

/**
 * The scores a player pinned, shown above their other scores.
 */
export default function PinnedScores({ playerId }: { playerId: string }) {
  const { data } = usePlayerPinnedScores(playerId);
  if (!data || data.items.length === 0) {
    return null;
  }

  return (
    <section className="border-border flex flex-col gap-1 border-b pb-3">
      <h3 className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
        <SharedIcons.PinScoreIcon className="size-4" />
        Pinned Scores
      </h3>
      <div className="divide-border divide-y">
        {data.items.map(({ score, leaderboard, beatSaver }) => (
          <div key={score.scoreId} className="cv-score-card">
            <ScoreSaberScoreDisplay
              score={score}
              leaderboard={leaderboard}
              beatSaverMap={beatSaver}
              settings={{ defaultLeaderboardScoresPage: 1 }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
