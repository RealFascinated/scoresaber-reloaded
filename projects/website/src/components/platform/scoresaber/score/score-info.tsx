import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { ScoreSaberScoreTimeSetVs } from "@/components/platform/scoresaber/score/score-time-set-vs";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
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
        {score.rank === -1 ? (
          <SimpleTooltip display="Unknown Score Rank">
            <p className="font-semibold">#-</p>
          </SimpleTooltip>
        ) : (
          <SimpleLink
            href={`/leaderboard/${leaderboard.id}?page=${getPageFromRank(score.rank, 12)}&highlight=${score.playerId}`}
          >
            <p
              className={cn(
                getRankColor(score.rank),
                "hover:text-primary/80 cursor-pointer text-base font-bold transition-all"
              )}
            >
              #{formatNumberWithCommas(score.rank)}
            </p>
          </SimpleLink>
        )}
        {hmd.logo && (
          <ScoreSaberScoreHMD score={score}>
            <span className="flex items-center">
              <SharedIcons.HeadMountedDisplayIcon hmd={hmd} />
            </span>
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
