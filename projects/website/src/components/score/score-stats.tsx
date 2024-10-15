import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import Tooltip from "@/components/tooltip";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badge";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score-saber-score-token";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";

const badges: ScoreBadge[] = [
  {
    name: "PP",
    color: () => {
      return "bg-pp";
    },
    create: (score: ScoreSaberScoreToken) => {
      const pp = score.pp;
      if (pp === 0) {
        return undefined;
      }
      const weightedPp = pp * score.weight;

      return (
        <>
          <Tooltip
            display={
              <div>
                <p>
                  Weighted: {formatPp(weightedPp)}pp ({(100 * score.weight).toFixed(2)}%)
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
    color: (score: ScoreSaberScoreToken, leaderboard: ScoreSaberLeaderboardToken) => {
      const acc = (score.baseScore / leaderboard.maxScore) * 100;
      return getScoreBadgeFromAccuracy(acc).color;
    },
    create: (score: ScoreSaberScoreToken, leaderboard: ScoreSaberLeaderboardToken) => {
      const acc = (score.baseScore / leaderboard.maxScore) * 100;
      const scoreBadge = getScoreBadgeFromAccuracy(acc);
      let accDetails = `Accuracy ${scoreBadge.name != "-" ? scoreBadge.name : ""}`;
      if (scoreBadge.max == null) {
        accDetails += ` (> ${scoreBadge.min}%)`;
      } else if (scoreBadge.min == null) {
        accDetails += ` (< ${scoreBadge.max}%)`;
      } else {
        accDetails += ` (${scoreBadge.min}% - ${scoreBadge.max}%)`;
      }

      return (
        <>
          <Tooltip
            display={
              <div>
                <p>{accDetails}</p>
              </div>
            }
          >
            <p className="cursor-default">{acc.toFixed(2)}%</p>
          </Tooltip>
        </>
      );
    },
  },
  {
    name: "Score",
    create: (score: ScoreSaberScoreToken) => {
      return `${formatNumberWithCommas(Number(score.baseScore.toFixed(0)))}`;
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
    create: (score: ScoreSaberScoreToken) => {
      return (
        <Tooltip
          display={
            <div className="flex flex-col justify-center items-center">
              {!score.fullCombo ? (
                <>
                  <p>Missed Notes: {formatNumberWithCommas(score.missedNotes)}</p>
                  <p>Bad Cuts: {formatNumberWithCommas(score.badCuts)}</p>
                </>
              ) : (
                <p>Full Combo</p>
              )}
            </div>
          }
        >
          <div className="flex gap-1">
            <p>
              {score.fullCombo ? (
                <span className="text-green-400">FC</span>
              ) : (
                formatNumberWithCommas(score.missedNotes + score.badCuts)
              )}
            </p>
            <XMarkIcon className={clsx("w-5 h-5", score.fullCombo ? "hidden" : "text-red-400")} />
          </div>
        </Tooltip>
      );
    },
  },
];

type Props = {
  score: ScoreSaberScoreToken;
  leaderboard: ScoreSaberLeaderboardToken;
};

export default function ScoreStats({ score, leaderboard }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-2 gap-1 ml-0 lg:ml-2 h-[64px]`}>
      <ScoreBadges badges={badges} score={score} leaderboard={leaderboard} />
    </div>
  );
}
