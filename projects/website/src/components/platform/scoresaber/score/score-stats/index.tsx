import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
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
    </div>
  );
}
