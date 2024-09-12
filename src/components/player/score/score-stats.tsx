import ScoreSaberPlayerScore from "@/common/data-fetcher/types/scoresaber/scoresaber-player-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import StatValue from "@/components/stat-value";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

type Badge = {
  name: string;
  create: (playerScore: ScoreSaberPlayerScore) => string | React.ReactNode | undefined;
};

const badges: Badge[] = [
  {
    name: "PP",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score } = playerScore;
      const pp = score.pp;
      if (pp === 0) {
        return undefined;
      }
      return `${score.pp.toFixed(2)}pp`;
    },
  },
  {
    name: "Accuracy",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score, leaderboard } = playerScore;
      const acc = (score.baseScore / leaderboard.maxScore) * 100;
      return `${acc.toFixed(2)}%`;
    },
  },
  {
    name: "Score",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score } = playerScore;
      return `${formatNumberWithCommas(score.baseScore)}`;
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
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score } = playerScore;
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
  playerScore: ScoreSaberPlayerScore;
};

export default function ScoreStats({ playerScore }: Props) {
  return (
    <div className={`grid grid-cols-3 grid-rows-2 gap-1 ml-0 lg:ml-2`}>
      {badges.map((badge, index) => {
        const toRender = badge.create(playerScore);
        if (toRender === undefined) {
          return <div key={index} />;
        }

        return <StatValue key={index} value={toRender} />;
      })}
    </div>
  );
}
