import { StarIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getDifficulty } from "@ssr/common/utils/song-utils";

type LeaderboardSongStarCountProps = {
  /**
   * The leaderboard for the song
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function LeaderboardSongStarCount({ leaderboard }: LeaderboardSongStarCountProps) {
  if (leaderboard.stars <= 0) {
    return null;
  }

  return (
    <div
      className="flex h-[20px] w-fit cursor-default items-center justify-center rounded-sm text-xs"
      style={{
        backgroundColor: getDifficulty(leaderboard.difficulty.difficulty).color + "f0", // Transparency value (in hex 0-255)
      }}
    >
      <div className="flex items-center justify-center gap-1 p-1">
        <p>{leaderboard.stars.toFixed(2)}</p>
        <StarIcon className="h-4 w-4" />
      </div>
    </div>
  );
}
