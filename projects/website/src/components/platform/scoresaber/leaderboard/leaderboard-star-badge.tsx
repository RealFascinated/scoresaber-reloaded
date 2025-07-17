import { StarIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getDifficulty } from "@ssr/common/utils/song-utils";

type LeaderboardStarBadgeProps = {
  leaderboard: ScoreSaberLeaderboard;
};

export function LeaderboardStarBadge({ leaderboard }: LeaderboardStarBadgeProps) {
  if (leaderboard.stars <= 0) {
    return null;
  }

  const difficultyInfo = getDifficulty(leaderboard.difficulty.difficulty);

  return (
    <div
      className="flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-white shadow-sm"
      style={{ backgroundColor: difficultyInfo.color }}
    >
      <span>{leaderboard.stars.toFixed(2)}</span>
      <StarIcon className="h-3.5 w-3.5" />
    </div>
  );
}
