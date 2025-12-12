import { cn } from "@/common/utils";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export function LeaderboardStatus({ leaderboard }: { leaderboard: ScoreSaberLeaderboard }) {
  const colors = {
    unranked: "bg-unranked/15 border-unranked text-unranked",
    ranked: "bg-ranked/15 border-ranked text-ranked",
    qualified: "bg-qualified/15 border-qualified text-qualified",
  };

  return (
    <div
      className={cn(
        "rounded-md border p-(--spacing-md) py-(--spacing-xs) font-bold uppercase",
        colors[leaderboard.status.toLowerCase() as keyof typeof colors]
      )}
    >
      {leaderboard.status}
    </div>
  );
}
