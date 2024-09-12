import ScoreSaberPlayerScore from "@/common/data-fetcher/types/scoresaber/scoresaber-player-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import StatValue from "@/components/stat-value";
import { XMarkIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

const stats = [
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
    name: "Full Combo",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score } = playerScore;
      const fullCombo = score.missedNotes === 0;

      return (
        <>
          <p>{fullCombo ? "FC" : formatNumberWithCommas(score.missedNotes)}</p>
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
  const itemsPerRow = 3;
  const totalStats = stats.length;
  const numRows = Math.ceil(totalStats / itemsPerRow);

  return (
    <div className="flex flex-wrap gap-2 pl-0 lg:pl-2">
      {Array.from({ length: numRows }).map((_, rowIndex) => {
        const startIndex = rowIndex * itemsPerRow;
        const endIndex = startIndex + itemsPerRow;
        const rowStats = stats.slice(startIndex, endIndex);
        const emptySpaces = itemsPerRow - rowStats.length;

        return (
          <div key={rowIndex} className="flex w-full gap-2">
            {rowIndex === numRows - 1 &&
              emptySpaces > 0 &&
              Array(emptySpaces)
                .fill(null)
                .map((_, index) => <div key={`empty-${index}`} className="flex-1 min-w-[30%]"></div>)}
            {rowStats.map((stat) => (
              <div key={stat.name} className="flex-1 min-w-[30%]">
                {stat.create(playerScore) && <StatValue value={stat.create(playerScore)} />}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
