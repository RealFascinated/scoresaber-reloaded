import ScoreSaberScore from "@/common/data-fetcher/types/scoresaber/scoresaber-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import { timeAgo } from "@/common/time-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";

type Props = {
  score: ScoreSaberScore;
  isLeaderboard?: boolean;
};

export default function ScoreRankInfo({ score, isLeaderboard = false }: Props) {
  return (
    <div
      className={clsx(
        "flex w-full flex-row justify-between lg:w-[125px] lg:flex-col",
        !isLeaderboard && "lg:justify-center items-center"
      )}
    >
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        <p className="text-pp">#{formatNumberWithCommas(score.rank)}</p>
      </div>
      {!isLeaderboard && <p className="text-sm">{timeAgo(new Date(score.timeSet))}</p>}
    </div>
  );
}
