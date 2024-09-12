import ScoreSaberLeaderboard from "@/common/data-fetcher/types/scoresaber/scoresaber-leaderboard";
import ScoreSaberScore from "@/common/data-fetcher/types/scoresaber/scoresaber-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import StatValue from "@/components/stat-value";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

type Badge = {
  name: string;
  create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => string | React.ReactNode | undefined;
};

const badges: Badge[] = [
  {
    name: "PP",
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
    create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => {
      const acc = (score.baseScore / leaderboard.maxScore) * 100;
      return `${acc.toFixed(2)}%`;
    },
  },
  {
    name: "Full Combo",
    create: (score: ScoreSaberScore) => {
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
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function LeaderboardScoreStats({ score, leaderboard }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-1 gap-1 ml-0 lg:ml-2`}>
      {badges.map((badge, index) => {
        const toRender = badge.create(score, leaderboard);
        if (toRender === undefined) {
          return <div key={index} />;
        }

        return <StatValue key={index} value={toRender} />;
      })}
    </div>
  );
}
