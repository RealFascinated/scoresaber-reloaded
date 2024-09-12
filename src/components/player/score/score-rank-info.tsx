import ScoreSaberPlayerScore from "@/common/data-fetcher/types/scoresaber/scoresaber-player-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import { timeAgo } from "@/common/time-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";

type Props = {
  playerScore: ScoreSaberPlayerScore;
};

export default function ScoreRankInfo({ playerScore }: Props) {
  const { score } = playerScore;

  return (
    <div className="flex w-full flex-row justify-between items-center lg:w-[125px] lg:justify-center lg:flex-col">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        <p className="text-pp">#{formatNumberWithCommas(score.rank)}</p>
      </div>
      <p className="text-sm">{timeAgo(new Date(score.timeSet))}</p>
    </div>
  );
}
