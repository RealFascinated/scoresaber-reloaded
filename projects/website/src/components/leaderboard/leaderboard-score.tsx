import LeaderboardPlayer from "./leaderboard-player";
import LeaderboardScoreStats from "./leaderboard-score-stats";
import ScoreRankInfo from "@/components/score/score-rank-info";
import ScoreSaberPlayer from "@ssr/common/types/player/impl/scoresaber-player";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score-saber-score-token";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";

type Props = {
  /**
   * The player who set the score.
   */
  player?: ScoreSaberPlayer;

  /**
   * The score to display.
   */
  score: ScoreSaberScoreToken;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboardToken;
};

export default function LeaderboardScore({ player, score, leaderboard }: Props) {
  return (
    <div className="py-1.5">
      <div className="grid items-center w-full gap-2 grid-cols-[20px 1fr_1fr] lg:grid-cols-[130px_4fr_300px]">
        <ScoreRankInfo score={score} />
        <LeaderboardPlayer player={player} score={score} />
        <LeaderboardScoreStats score={score} leaderboard={leaderboard} />
      </div>
    </div>
  );
}
