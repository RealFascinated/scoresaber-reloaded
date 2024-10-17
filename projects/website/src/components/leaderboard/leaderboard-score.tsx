import LeaderboardPlayer from "./leaderboard-player";
import LeaderboardScoreStats from "./leaderboard-score-stats";
import ScoreRankInfo from "@/components/score/score-rank-info";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";

type Props = {
  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardScore({ player, score, leaderboard }: Props) {
  return (
    <div className="py-1.5">
      <div className="grid items-center w-full gap-2 grid-cols-[20px 1fr_1fr] lg:grid-cols-[130px_4fr_300px]">
        <ScoreRankInfo score={score} leaderboard={leaderboard} />
        <LeaderboardPlayer player={player} score={score} />
        <LeaderboardScoreStats score={score} leaderboard={leaderboard} />
      </div>
    </div>
  );
}
