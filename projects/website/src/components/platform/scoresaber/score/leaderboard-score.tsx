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
import { Spinner } from "@/components/spinner";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/schemas/response/beatsaver/beatsaver-map";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { ChevronDown } from "lucide-react";
import React, { useState } from "react";
import ScoreDetailsDropdown from "./score-details-dropdown";
import { ScoreSaberScoreHMD } from "./score-hmd";

const TABLE_CELL_WIDTH = "px-3 py-2";
const TABLE_CELL_WIDTH_SMALL = "px-1.5 py-2";

export default function ScoreSaberLeaderboardScore({
  score,
  leaderboard,
  highlightedPlayerId,
  beatSaverMap,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
  beatSaverMap?: BeatSaverMapResponse;
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const scorePlayer = score.playerInfo;

  return (
    <React.Fragment>
      <tr
        className={cn(
          "hover:bg-muted/30 transition-colors duration-200",
          highlightedPlayerId === score.playerId && "bg-primary/10"
        )}
      >
        <>
          {/* Score Rank */}
          <td className={cn(TABLE_CELL_WIDTH, "whitespace-nowrap")}>
            <p className={getRankColor(score.rank)}>
              {score.rank !== -1 ? `#${formatNumberWithCommas(score.rank)}` : "-"}
            </p>
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
          <td className={cn(TABLE_CELL_WIDTH, "text-center whitespace-nowrap")}>
            {formatScoreAccuracy(score.accuracy)}
          </td>

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
                <ScoreReplayButton score={score} />
              </div>
            )}
          </td>

          {score.additionalData && (
            <td className={cn(TABLE_CELL_WIDTH_SMALL, "w-[45px] pr-3")}>
              <SimpleTooltip display="View score details">
                <button className="size-6 cursor-pointer" onClick={() => setDetailsExpanded(!detailsExpanded)}>
                  {isDetailsLoading ? (
                    <Spinner size="sm" />
                  ) : (
                    <ChevronDown
                      className={cn("size-6 transition-transform duration-200", detailsExpanded ? "" : "rotate-180")}
                    />
                  )}
                </button>
              </SimpleTooltip>
            </td>
          )}
        </>
      </tr>

      {/* Dropdown row - appears directly below the clicked row */}
      {detailsExpanded && (
        <td colSpan={10} className="p-(--spacing-md)">
          <ScoreDetailsDropdown
            score={score}
            leaderboard={leaderboard}
            highlightedPlayerId={highlightedPlayerId}
            showLeaderboardScores={false}
            isLoading={setIsDetailsLoading}
            isExpanded
            isLeaderboardScore
          />
        </td>
      )}
    </React.Fragment>
  );
}
