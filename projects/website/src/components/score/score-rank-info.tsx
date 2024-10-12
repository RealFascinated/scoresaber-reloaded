import { formatNumberWithCommas } from "@/common/number-utils";
import { format } from "@formkit/tempo";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Tooltip from "../tooltip";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score-saber-score-token";
import { timeAgo } from "@ssr/common/utils/time-utils";
import Link from "next/link";
import { getPageFromRank } from "@ssr/common/utils/utils";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";

type Props = {
  score: ScoreSaberScoreToken;
  leaderboard: ScoreSaberLeaderboardToken;
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
