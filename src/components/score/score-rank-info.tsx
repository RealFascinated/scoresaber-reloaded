import ScoreSaberScore from "@/common/service/types/scoresaber/scoresaber-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import { timeAgo } from "@/common/time-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";

type Props = {
  score: ScoreSaberScore;
};

export default function ScoreRankInfo({ score }: Props) {
  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        <p className="text-pp">#{formatNumberWithCommas(score.rank)}</p>
      </div>
      <p className="text-sm">{timeAgo(new Date(score.timeSet))}</p>
    </div>
  );
}
