import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import HMDIcon from "@/components/hmd-icon";
import { ScoreSaberScoreTimeSetVs } from "@/components/platform/scoresaber/score/score-time-set-vs";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getPageFromRank } from "@ssr/common/utils/utils";
import { ScoreSaberScoreHMD } from "./score-hmd";

export default function ScoreSaberScoreInfo({
  score,
  leaderboard,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
}) {
  const hmd = getHMDInfo(score.hmd as HMD);

  return (
    <div className="flex w-full flex-row items-center justify-between lg:w-[120px] lg:flex-col lg:justify-center">
      <div className="flex items-center gap-1">
        <GlobeAmericasIcon className="size-5" />
        {score.rank === -1 ? (
          <SimpleTooltip display="Unknown Score Rank">
            <p className="font-semibold">#-</p>
          </SimpleTooltip>
        ) : (
          <SimpleLink href={`/leaderboard/${leaderboard.id}/${getPageFromRank(score.rank, 12)}`}>
            <p
              className={cn(
                getRankColor(score.rank),
                "hover:text-primary/80 cursor-pointer font-semibold transition-all"
              )}
            >
              #{formatNumberWithCommas(score.rank)}
            </p>
          </SimpleLink>
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
