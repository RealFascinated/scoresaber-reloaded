import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badge";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreMissesAndPausesBadge from "@/components/score/badges/score-misses-and-pauses";
import { HandAccuracyBadge } from "@/components/score/badges/hand-accuracy";
import { ScoreAccuracyBadge } from "@/components/score/badges/score-accuracy";
import { ScorePpBadge } from "@/components/score/badges/score-pp";
import { ScoreScoreBadge } from "@/components/score/badges/score-score";

const badges: ScoreBadge[] = [
  {
    name: "PP",
    color: () => {
      return "bg-pp";
    },
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      if (!score.pp) {
        return undefined;
      }
      return <ScorePpBadge score={score} leaderboard={leaderboard} />;
    },
  },
  {
    name: "Accuracy",
    color: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const acc = (score.score / leaderboard.maxScore) * 100;
      return getScoreBadgeFromAccuracy(acc).color;
    },
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      return <ScoreAccuracyBadge score={score} leaderboard={leaderboard} />;
    },
  },
  {
    name: "Score",
    create: (score: ScoreSaberScore) => {
      return <ScoreScoreBadge score={score} />;
    },
  },
  {
    name: "Left Hand Accuracy",
    color: () => "bg-hands-left",
    create: (score: ScoreSaberScore) => {
      if (!score.additionalData) {
        return undefined;
      }
      return <HandAccuracyBadge score={score} hand="left" />;
    },
  },
  {
    name: "Right Hand Accuracy",
    color: () => "bg-hands-right",
    create: (score: ScoreSaberScore) => {
      if (!score.additionalData) {
        return undefined;
      }
      return <HandAccuracyBadge score={score} hand="right" />;
    },
  },
  {
    name: "Full Combo",
    create: (score: ScoreSaberScore) => {
      return <ScoreMissesAndPausesBadge score={score} />;
    },
  },
];

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function ScoreStats({ score, leaderboard }: Props) {
  return (
    <div className="flex flex-col justify-center h-full">
      <div className={`grid grid-cols-3 gap-1 ml-0 lg:ml-2 justify-center`}>
        <ScoreBadges badges={badges} score={score} leaderboard={leaderboard} />
      </div>
    </div>
  );
}
