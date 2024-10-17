import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { format } from "@formkit/tempo";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Tooltip from "../tooltip";
import { timeAgo } from "@ssr/common/utils/time-utils";
import Link from "next/link";
import { getPageFromRank } from "@ssr/common/utils/utils";
import ScoreSaberScore from "@ssr/common/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function ScoreRankInfo({ score, leaderboard }: Props) {
  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        <Link href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}>
          <p className="text-pp cursor-default hover:brightness-75 transition-all transform-gpu cursor-pointer">
            #{formatNumberWithCommas(score.rank)}
          </p>
        </Link>
      </div>
      <Tooltip
        side="bottom"
        display={
          <p>
            {format({
              date: new Date(score.timestamp),
              format: "DD MMMM YYYY HH:mm a",
            })}
          </p>
        }
      >
        <p className="text-sm cursor-default select-none">{timeAgo(new Date(score.timestamp))}</p>
      </Tooltip>
    </div>
  );
}
