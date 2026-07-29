import { cn } from "@/common/utils";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";

export function LeaderboardStatus({ leaderboard }: { leaderboard: ScoreSaberLeaderboard }) {
  const colors = {
    unranked: "bg-unranked/15 border-unranked text-unranked",
    ranked: "bg-ranked/15 border-ranked text-ranked",
    qualified: "bg-qualified/15 border-qualified text-qualified",
  };

  return (
    <div
      className={cn(
        "w-fit rounded-md border px-2 py-0.5 text-xs font-bold uppercase",
        colors[leaderboard.status.toLowerCase() as keyof typeof colors]
      )}
    >
      {leaderboard.status}
    </div>
  );
}
