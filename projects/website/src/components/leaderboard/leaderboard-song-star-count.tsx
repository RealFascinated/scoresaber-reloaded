import { getDifficulty } from "@/common/song-utils";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";

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
      className="w-fit h-[20px] rounded-sm flex justify-center items-center text-xs cursor-default"
      style={{
        backgroundColor: getDifficulty(leaderboard.difficulty.difficulty).color + "f0", // Transparency value (in hex 0-255)
      }}
    >
      <div className="flex gap-1 items-center justify-center p-1">
        <p>{leaderboard.stars}</p>
        <StarIcon className="w-4 h-4" />
      </div>
    </div>
  );
}
