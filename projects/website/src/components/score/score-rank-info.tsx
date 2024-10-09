import { formatNumberWithCommas } from "@/common/number-utils";
import { format } from "@formkit/tempo";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Tooltip from "../tooltip";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score-saber-score-token";
import { timeAgo } from "@ssr/common/utils/time-utils";

type Props = {
  score: ScoreSaberScoreToken;
};

export default function ScoreRankInfo({ score }: Props) {
  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        <p className="text-pp cursor-default">#{formatNumberWithCommas(score.rank)}</p>
      </div>
      <Tooltip
        display={
          <p>
            {format({
              date: new Date(score.timeSet),
              format: "DD MMMM YYYY HH:mm a",
            })}
          </p>
        }
      >
        <p className="text-sm cursor-default select-none">{timeAgo(new Date(score.timeSet))}</p>
      </Tooltip>
    </div>
  );
}
