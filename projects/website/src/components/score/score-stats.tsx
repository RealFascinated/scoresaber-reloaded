import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import Tooltip from "@/components/tooltip";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badge";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import ScoreMissesBadge from "@/components/score/badges/score-misses";
import { Modifier } from "@ssr/common/score/modifier";
import { ScoreModifiers } from "@/components/score/score-modifiers";

const badges: ScoreBadge[] = [
  {
    name: "PP",
    color: () => {
      return "bg-pp";
    },
    create: (score: ScoreSaberScore) => {
      const pp = score.pp;
      const weight = score.weight;
      if (pp === 0 || pp === undefined || weight === undefined) {
        return undefined;
      }
      const weightedPp = pp * weight;

      return (
        <>
          <Tooltip
            display={
              <div>
                <p className="font-semibold">Performance Points</p>
                <p>Raw: {formatPp(pp)}pp</p>
                <p>
                  Weighted: {formatPp(weightedPp)}pp ({(100 * weight).toFixed(2)}%)
                </p>
              </div>
            }
          >
            <p>{formatPp(pp)}pp</p>
          </Tooltip>
        </>
      );
    },
  },
  {
    name: "Accuracy",
    color: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const acc = (score.score / leaderboard.maxScore) * 100;
      return getScoreBadgeFromAccuracy(acc).color;
    },
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const acc = (score.score / leaderboard.maxScore) * 100;
      const scoreBadge = getScoreBadgeFromAccuracy(acc);
      let accDetails = `${scoreBadge.name != "-" ? scoreBadge.name : ""}`;
      if (scoreBadge.max == null) {
        accDetails += ` (> ${scoreBadge.min}%)`;
      } else if (scoreBadge.min == null) {
        accDetails += ` (< ${scoreBadge.max}%)`;
      } else {
        accDetails += ` (${scoreBadge.min}% - ${scoreBadge.max}%)`;
      }

      const failed = score.modifiers.includes("No Fail" as Modifier);
      const modCount = score.modifiers.length;
      return (
        <>
          <Tooltip
            display={
              <div className="flex flex-col gap-2">
                <div>
                  <p className="font-semibold">Accuracy</p>
                  <p>{accDetails}</p>
                </div>

                {modCount > 0 && (
                  <div>
                    <p className="font-semibold">Modifiers</p>
                    <ScoreModifiers type="full" score={score} />
                  </div>
                )}
                {failed && <p className="text-red-500">Failed</p>}
              </div>
            }
          >
            <p className="cursor-default">
              {acc.toFixed(2)}% {modCount > 0 && <ScoreModifiers type="simple" score={score} />}
            </p>
          </Tooltip>
        </>
      );
    },
  },
  {
    name: "Score",
    create: (score: ScoreSaberScore) => {
      return `${formatNumberWithCommas(Number(score.score.toFixed(0)))}`;
    },
  },
  {
    name: "",
    create: () => undefined,
  },
  {
    name: "",
    create: () => undefined,
  },
  {
    name: "Full Combo",
    create: (score: ScoreSaberScore) => {
      return <ScoreMissesBadge score={score} />;
    },
  },
];

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function ScoreStats({ score, leaderboard }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-2 gap-1 ml-0 lg:ml-2 h-[64px]`}>
      <ScoreBadges badges={badges} score={score} leaderboard={leaderboard} />
    </div>
  );
}
