"use client";

import ScoreSaberLeaderboard from "@/common/service/types/scoresaber/scoresaber-leaderboard";
import ScoreSaberScore from "@/common/service/types/scoresaber/scoresaber-score";
import ScoreRankInfo from "../player/score/score-rank-info";
import LeaderboardPlayer from "./leaderboard-player";
import LeaderboardScoreStats from "./leaderboard-score-stats";

type Props = {
  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboard;
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
