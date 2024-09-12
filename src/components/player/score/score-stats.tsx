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
      return <StatValue value={`${score.pp.toFixed(2)}pp`} />;
    },
  },
  {
    name: "Accuracy",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score, leaderboard } = playerScore;
      const acc = (score.baseScore / leaderboard.maxScore) * 100;
      return <StatValue value={`${acc.toFixed(2)}%`} />;
    },
  },
  {
    name: "Score",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score } = playerScore;
      return <StatValue value={`${formatNumberWithCommas(score.baseScore)}`} />;
    },
  },
  {
    name: "Full Combo",
    create: (playerScore: ScoreSaberPlayerScore) => {
      const { score } = playerScore;
      const fullCombo = score.missedNotes === 0;

      return (
        <StatValue
          value={
            <>
              <p>{fullCombo ? "FC" : formatNumberWithCommas(score.missedNotes)}</p>
              <XMarkIcon className={clsx("w-5 h-5", fullCombo ? "hidden" : "text-red-400")} />
            </>
          }
        />
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
  const remainingItems = totalStats % itemsPerRow;
  const emptySpaces = remainingItems > 0 ? itemsPerRow - remainingItems : 0;

  return (
    <div className="flex flex-wrap gap-2 pl-0 lg:pl-2">
      {/* Render all but the last row of stats normally */}
      {stats.slice(0, totalStats - remainingItems).map((stat) => (
        <div key={stat.name} className="flex-1 min-w-[30%]">
          {stat.create(playerScore)}
        </div>
      ))}

      {/* Handle the last row - align right and push empty spaces to the left */}
      <div className="flex justify-end w-full gap-2">
        {Array(emptySpaces)
          .fill(null)
          .map((_, index) => (
            <div key={`empty-${index}`} className="flex-1 min-w-[30%]"></div>
          ))}
        {stats.slice(totalStats - remainingItems).map((stat) => (
          <div key={stat.name} className="flex-1 min-w-[30%]">
            {stat.create(playerScore)}
          </div>
        ))}
      </div>
    </div>
  );
}
