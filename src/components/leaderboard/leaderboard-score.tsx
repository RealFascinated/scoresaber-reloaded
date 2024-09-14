"use client";

import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import ScoreSaberScoreToken from "@/common/model/token/scoresaber/score-saber-score-token";
import LeaderboardPlayer from "./leaderboard-player";
import LeaderboardScoreStats from "./leaderboard-score-stats";
import ScoreRankInfo from "@/components/score/score-rank-info";

type Props = {
  /**
   * The score to display.
   */
  score: ScoreSaberScoreToken;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboardToken;
};

export default function LeaderboardScore({ score, leaderboard }: Props) {
  return (
    <div className="grid items-center w-full pb-2 pt-2 gap-2 lg:gap-0 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[130px_4fr_300px]">
      <ScoreRankInfo score={score} />
      <LeaderboardPlayer score={score} />
      <LeaderboardScoreStats score={score} leaderboard={leaderboard} />
    </div>
  );
}
