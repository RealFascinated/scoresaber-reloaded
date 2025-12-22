import { HandAccuracyBadge } from "@/components/platform/scoresaber/score/badges/hand-accuracy";
import { ScoreAccuracyBadge } from "@/components/platform/scoresaber/score/badges/score-accuracy";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import { ScoreScoreBadge } from "@/components/platform/scoresaber/score/badges/score-score";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badges";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { getScoreBadgeFromAccuracy } from "@ssr/common/utils/song-utils";
import { ScoreMedalsBadge } from "../badges/score-medals";

const mainBadges: ScoreBadge<ScoreSaberScore, ScoreSaberLeaderboard>[] = [
  {
    name: "PP",
    color: (_, __, medalsMode?: boolean) => {
      return medalsMode ? "bg-medals" : "bg-statistic";
    },
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard, medalsMode?: boolean) => {
      if (medalsMode) {
        return <ScoreMedalsBadge score={score} />;
      }

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
    create: (score: ScoreSaberScore) => {
      return <ScoreAccuracyBadge score={score} />;
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
      if (!score.beatLeaderScore) {
        return undefined;
      }
      return <HandAccuracyBadge score={score} hand="left" />;
    },
  },
  {
    name: "Right Hand Accuracy",
    color: () => "bg-hands-right",
    create: (score: ScoreSaberScore) => {
      if (!score.beatLeaderScore) {
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

type MainScoreBadgesProps = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  medalsMode?: boolean;
};

export function MainScoreBadges({ score, leaderboard, medalsMode }: MainScoreBadgesProps) {
  return (
    <div className="grid w-full grid-cols-3 justify-center gap-1">
      <ScoreBadges badges={mainBadges} score={score} leaderboard={leaderboard} medalsMode={medalsMode} />
    </div>
  );
}
