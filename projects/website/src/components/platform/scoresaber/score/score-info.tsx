import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import HMDIcon from "@/components/hmd-icon";
import { ScoreSaberScoreTimeSetVs } from "@/components/platform/scoresaber/score/score-time-set-vs";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import Link from "next/link";
import { ScoreSaberScoreHMD } from "./score-hmd";

export default function ScoreSaberScoreInfo({
  score,
  leaderboard,
  hideRank,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  hideRank?: boolean;
}) {
  const hmd = getHMDInfo(score.hmd as HMD);

  return (
    <div className="flex w-full flex-row items-center justify-between lg:w-[125px] lg:flex-col lg:justify-center">
      <div className="flex items-center gap-1">
        <GlobeAmericasIcon className="size-5" />
        {hideRank ? (
          <p className="font-semibold">#-</p>
        ) : (
          <Link href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}>
            <p
              className={cn(
                getRankColor(score.rank),
                "cursor-pointer font-semibold transition-all hover:brightness-[66%]"
              )}
            >
              #{formatNumberWithCommas(score.rank)}
            </p>
          </Link>
        )}
        {hmd.logo && (
          <ScoreSaberScoreHMD score={score}>
            <HMDIcon hmd={hmd} />
          </ScoreSaberScoreHMD>
        )}
      </div>
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={score.timestamp} />
        <ScoreSaberScoreTimeSetVs score={score} />
      </div>
    </div>
  );
}
