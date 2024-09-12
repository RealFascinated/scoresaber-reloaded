"use client";

import ScoreSaberLeaderboard from "@/common/data-fetcher/types/scoresaber/scoresaber-leaderboard";
import ScoreSaberScore from "@/common/data-fetcher/types/scoresaber/scoresaber-score";
import { timeAgo } from "@/common/time-utils";
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
    <div className="grid w-full pb-2 pt-2 gap-2 lg:gap-0 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] lg:grid-cols-[100px_4fr_0.8fr_300px]">
      <ScoreRankInfo score={score} isLeaderboard />
      <LeaderboardPlayer score={score} />
      <p className="text-sm text-right">{timeAgo(new Date(score.timeSet))}</p>
      <LeaderboardScoreStats score={score} leaderboard={leaderboard} />
    </div>
  );
}
