import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { ComparisonScoreBadges } from "./comparison-score-badges";
import { MainScoreBadges } from "./main-score-badges";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  medalsMode?: boolean;
};

export default function ScoreSaberScoreStats({ score, leaderboard, medalsMode }: Props) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-2">
      <MainScoreBadges score={score} leaderboard={leaderboard} medalsMode={medalsMode} />
      {score.comparisonScore && (
        <ComparisonScoreBadges score={score.comparisonScore} leaderboard={leaderboard} />
      )}
    </div>
  );
}

export { ComparisonScoreBadges, MainScoreBadges };
