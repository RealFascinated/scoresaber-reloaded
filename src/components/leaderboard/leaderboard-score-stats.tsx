import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import ScoreSaberScoreToken from "@/common/model/token/scoresaber/score-saber-score-token";
import { formatNumberWithCommas } from "@/common/number-utils";
import StatValue from "@/components/stat-value";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import Tooltip from "@/components/tooltip";
import { ScoreBadge } from "@/components/score/score-badge";

const badges: ScoreBadge[] = [
  {
    name: "PP",
    create: (score: ScoreSaberScoreToken) => {
      const pp = score.pp;
      if (pp === 0) {
        return undefined;
      }
      return `${score.pp.toFixed(2)}pp`;
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
    name: "Full Combo",
    create: (score: ScoreSaberScoreToken) => {
      const fullCombo = score.missedNotes === 0;

      return (
        <>
          <p>{fullCombo ? <span className="text-green-400">FC</span> : formatNumberWithCommas(score.missedNotes)}</p>
          <XMarkIcon className={clsx("w-5 h-5", fullCombo ? "hidden" : "text-red-400")} />
        </>
      );
    },
  },
];

type Props = {
  score: ScoreSaberScoreToken;
  leaderboard: ScoreSaberLeaderboardToken;
};

export default function LeaderboardScoreStats({ score, leaderboard }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-1 gap-1 ml-0 lg:ml-2`}>
      {badges.map((badge, index) => {
        const toRender = badge.create(score, leaderboard);
        const color = badge.color?.(score, leaderboard);
        if (toRender === undefined) {
          return <div key={index} />;
        }
        return <StatValue key={index} color={color} value={toRender} />;
      })}
    </div>
  );
}
