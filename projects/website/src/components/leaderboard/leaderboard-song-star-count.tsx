import { songDifficultyToColor } from "@/common/song-utils";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import { getDifficultyFromScoreSaberDifficulty } from "@/common/scoresaber-utils";

type LeaderboardSongStarCountProps = {
  /**
   * The leaderboard for the song
   */
  leaderboard: ScoreSaberLeaderboardToken;
};

export function LeaderboardSongStarCount({ leaderboard }: LeaderboardSongStarCountProps) {
  if (leaderboard.stars <= 0) {
    return null;
  }

  const diff = getDifficultyFromScoreSaberDifficulty(leaderboard.difficulty.difficulty);
  return (
    <div
      className="w-fit h-[20px] rounded-sm flex justify-center items-center text-xs cursor-default"
      style={{
        backgroundColor: songDifficultyToColor(diff) + "f0", // Transparency value (in hex 0-255)
      }}
    >
      <div className="flex gap-1 items-center justify-center p-1">
        <p>{leaderboard.stars}</p>
        <StarIcon className="w-4 h-4" />
      </div>
    </div>
  );
}
