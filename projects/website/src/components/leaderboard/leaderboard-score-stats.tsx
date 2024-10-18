import { getScoreBadgeFromAccuracy } from "@/common/song-utils";
import Tooltip from "@/components/tooltip";
import { ScoreBadge, ScoreBadges } from "@/components/score/score-badge";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import FullComboBadge from "@/components/score/badges/full-combo";

const badges: ScoreBadge[] = [
  {
    name: "PP",
    color: () => {
      return "bg-pp";
    },
    create: (score: ScoreSaberScore) => {
      const pp = score.pp;
      if (pp === 0) {
        return undefined;
      }
      return `${score.pp.toFixed(2)}pp`;
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
    create: (score: ScoreSaberScore) => {
      return <FullComboBadge score={score} />;
    },
  },
];

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardScoreStats({ score, leaderboard }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-1 gap-1 ml-0 lg:ml-2`}>
      <ScoreBadges badges={badges} score={score} leaderboard={leaderboard} />
    </div>
  );
}
