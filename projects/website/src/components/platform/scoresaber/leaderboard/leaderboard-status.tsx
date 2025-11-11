import { cn } from "@/common/utils";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export function LeaderboardStatus({ leaderboard }: { leaderboard: ScoreSaberLeaderboard }) {
  let color = "bg-gray-600"; // unranked
  if (leaderboard.status === "Ranked") {
    color = "bg-pp"; // ranked
  } else if (leaderboard.status === "Qualified") {
    color = "bg-yellow-600"; // qualified
  }
  return <div className={cn(color, "rounded-md p-2 py-1 uppercase")}>{leaderboard.status}</div>;
}