import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import HMDIcon from "@/components/hmd-icon";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import { PlayerInfo } from "@/components/player/player-info";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleTooltip from "@/components/simple-tooltip";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { ArrowUpIcon } from "lucide-react";
import { ScoreSaberScoreHMD } from "./score-hmd";

const TABLE_CELL_WIDTH = "px-3 py-2";
const TABLE_CELL_WIDTH_SMALL = "px-1.5 py-2";

export default function ScoreSaberLeaderboardScore({
  score,
  leaderboard,
  highlightedPlayerId,
  showDropdown = false,
  onDropdownToggle,
  isDropdownExpanded = false,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
  showDropdown?: boolean;
  onDropdownToggle?: () => void;
  isDropdownExpanded?: boolean;
}) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className={cn(TABLE_CELL_WIDTH, "whitespace-nowrap")}>
        <p className={getRankColor(score.rank)}>{score.rank !== -1 ? `#${formatNumberWithCommas(score.rank)}` : "-"}</p>
      </td>

      {/* Player */}
      <td className={cn(TABLE_CELL_WIDTH, "flex w-full min-w-[300px] items-center gap-2 whitespace-nowrap")}>
        {scorePlayer ? (
          <>
            <ScoreSaberScoreHMD score={score}>
              <HMDIcon hmd={getHMDInfo(score.hmd as HMD)} />
            </ScoreSaberScoreHMD>
            <PlayerInfo player={scorePlayer} highlightedPlayerId={highlightedPlayerId} useLink className="w-full" />
          </>
        ) : (
          <p className="text-gray-500">Unknown Player</p>
        )}
      </td>

      {/* Time Set */}
      <td className={cn(TABLE_CELL_WIDTH, "text-center whitespace-nowrap")}>
        <ScoreTimeSet timestamp={score.timestamp} />
      </td>

      {/* Score Accuracy */}
      <td className={cn(TABLE_CELL_WIDTH, "text-center whitespace-nowrap")}>{formatScoreAccuracy(score.accuracy)}</td>

      {/* Score Misses */}
      <td
        className={cn(
          TABLE_CELL_WIDTH,
          "cursor-default whitespace-nowrap",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        <ScoreMissesAndPausesBadge score={score} hideXMark hidePreviousScore />
      </td>

      {/* PP / Score */}
      {leaderboard.stars > 0 ? (
        <td className={cn(TABLE_CELL_WIDTH, "text-pp whitespace-nowrap")}>
          <ScorePpBadge score={score} leaderboard={leaderboard} />
        </td>
      ) : (
        <td className={cn(TABLE_CELL_WIDTH, "text-center whitespace-nowrap")}>
          <p>{formatNumberWithCommas(score.score)}</p>
        </td>
      )}

      {/* Score Modifiers */}
      <td className={cn(TABLE_CELL_WIDTH, "text-center whitespace-nowrap")}>
        {score.modifiers.length > 0 ? (
          <SimpleTooltip
            side="bottom"
            display={
              <div>
                <p className="font-semibold">Modifiers</p>
                <ScoreSaberScoreModifiers type="full" score={score} />
              </div>
            }
          >
            <p className="cursor-default">
              <ScoreSaberScoreModifiers type="simple" score={score} />
            </p>
          </SimpleTooltip>
        ) : (
          "-"
        )}
      </td>

      {/* Score Replay */}
      <td className={cn(TABLE_CELL_WIDTH_SMALL, "w-[37px]")}>
        {score.additionalData && (
          <div className="flex justify-center">
            <ScoreReplayButton additionalData={score.additionalData} />
          </div>
        )}
      </td>

      {showDropdown && score.additionalData && (
        <td className={cn(TABLE_CELL_WIDTH_SMALL, "w-[45px] pr-3")}>
          <SimpleTooltip display="View score">
            <div className="flex cursor-default items-center justify-center">
              <ArrowUpIcon
                className={cn(
                  "size-5 cursor-pointer transition-transform duration-200",
                  isDropdownExpanded ? "rotate-180" : ""
                )}
                onClick={onDropdownToggle}
              />
            </div>
          </SimpleTooltip>
        </td>
      )}
    </>
  );
}
