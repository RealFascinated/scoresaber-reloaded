import { getRankColor } from "@/common/color-utils";
import { ScoreSaberScoreTimeSetVs } from "@/components/platform/scoresaber/score/score-time-set-vs";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleTooltip from "@/components/simple-tooltip";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

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

  const rankElement = useMemo(() => {
    if (hideRank) {
      return <p className="text-ssr">#-</p>;
    }
    return (
      <Link
        prefetch={false}
        href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}
      >
        <p
          className={`${getRankColor(score.rank)} hover:brightness-[66%] transition-all cursor-pointer`}
        >
          #{formatNumberWithCommas(score.rank)}
        </p>
      </Link>
    );
  }, [score.rank, leaderboard.id, hideRank]);

  const hmdElement = useMemo(() => {
    if (!hmd.logo) return null;
    return (
      <SimpleTooltip
        display={
          <div className="flex flex-col gap-2">
            {score.hmd ? (
              <p>
                Score was set on <span className="font-semibold">{score.hmd}</span>
              </p>
            ) : (
              <p>An unknown HMD was used (mod did not submit hmd data)</p>
            )}

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
    );
  }, [hmd, score.hmd, score.controllers]);

  const timeInfo = useMemo(
    () => (
      <div className="flex items-center gap-2 lg:flex-col lg:gap-0">
        <ScoreTimeSet timestamp={score.timestamp} />
        <ScoreSaberScoreTimeSetVs score={score} />
      </div>
    ),
    [score]
  );

  return (
    <div className="flex w-full flex-row justify-between lg:w-[125px] lg:flex-col lg:justify-center items-center">
      <div className="flex gap-1 items-center">
        <GlobeAmericasIcon className="w-5 h-5" />
        {rankElement}
        {hmdElement}
      </div>
      {timeInfo}
    </div>
  );
}
