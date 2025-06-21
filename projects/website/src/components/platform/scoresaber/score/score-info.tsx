import { getRankColor } from "@/common/color-utils";
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
import { useMemo } from "react";
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

  const rankElement = useMemo(() => {
    if (hideRank) {
      return <span>#-</span>;
    }
    return (
      <Link href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}>
        <p
          className={`${getRankColor(score.rank)} cursor-pointer transition-all hover:brightness-[66%]`}
        >
          #{formatNumberWithCommas(score.rank)}
        </p>
      </Link>
    );
  }, [score.rank, leaderboard.id, hideRank]);

  const hmdElement = useMemo(() => {
    if (!hmd.logo) return null;
    return (
      <ScoreSaberScoreHMD score={score}>
        <HMDIcon hmd={hmd} />
      </ScoreSaberScoreHMD>
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
    <div className="flex w-full flex-row items-center justify-between lg:w-[125px] lg:flex-col lg:justify-center">
      <div className="flex items-center gap-1">
        <GlobeAmericasIcon className="h-5 w-5" />
        {rankElement}
        {hmdElement}
      </div>
      {timeInfo}
    </div>
  );
}
