import { ScoreTimeSet } from "@/components/score/score-time-set";
import { ScoreTimeSetVs } from "@/components/score/score-time-set-vs";
import SimpleTooltip from "@/components/simple-tooltip";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import Image from "next/image";
import Link from "next/link";

type Props = {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  hideRank?: boolean;
};

export default function ScoreInfo({ score, leaderboard, hideRank }: Props) {
  const hmd = getHMDInfo(score.hmd as HMD);

  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />

        {/* Score Rank */}
        {!hideRank ? (
          <Link
            prefetch={false}
            href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}
          >
            <p className="text-ssr hover:brightness-[66%] transition-all transform-gpu cursor-pointer">
              #{formatNumberWithCommas(score.rank)}
            </p>
          </Link>
        ) : (
          <p className="text-ssr">-</p>
        )}

        {/* Score HMD and Controllers */}
        {hmd.logo && (
          <SimpleTooltip
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
              src={`https://cdn.fascinated.cc/assets/hmds/${hmd.logo}`}
              alt={`${hmd.logo} Logo`}
              width={24}
              height={24}
              className="w-5 h-5 rounded-full"
              style={{
                filter: hmd.filters,
              }}
            />
          </SimpleTooltip>
        )}
      </div>
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={score.timestamp} />
        <ScoreTimeSetVs score={score} />
      </div>
    </div>
  );
}
