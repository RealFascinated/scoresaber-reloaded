import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import { ScoreTimeSetVs } from "@/components/score/score-time-set-vs";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import Image from "next/image";
import Tooltip from "@/components/tooltip";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export default function ScoreInfo({ score, leaderboard }: Props) {
  const hmd = getHMDInfo(score.hmd as HMD);

  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />

        {/* Score Rank */}
        <Link prefetch={false} href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}>
          <p className="text-ssr cursor-default hover:brightness-[66%] transition-all transform-gpu cursor-pointer">
            #{formatNumberWithCommas(score.rank)}
          </p>
        </Link>

        {/* Score HMD and Controllers */}
        {hmd.logo && (
          <Tooltip
            display={
              <div className="flex flex-col gap-2">
                <p>
                  Score was set on <span className="font-semibold">{score.hmd ?? "Unknown"}</span>
                </p>

                {score.controllers && (
                  <div>
                    <p className="font-semibold">Controllers</p>
                    <div>
                      <p>Left: {score.controllers.leftController}</p>
                      <p>Right: {score.controllers.rightController}</p>
                    </div>
                  </div>
                )}
              </div>
            }
          >
            <Image
              src={`/assets/hmds/${hmd.logo}`}
              alt={`${hmd.logo} Logo`}
              width={24}
              height={24}
              className="w-5 h-5 rounded-full"
              unoptimized
              style={{
                filter: hmd.filters,
              }}
            />
          </Tooltip>
        )}
      </div>
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet score={score} />
        <ScoreTimeSetVs score={score} />
      </div>
    </div>
  );
}
