import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import { PlayerInfo } from "@/components/player/player-info";
import PlayerPreview from "@/components/player/player-preview";
import { ScoreReplayButton } from "@/components/score/button/score-replay-button";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleTooltip from "@/components/simple-tooltip";
import { ArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";

export default function ScoreSaberLeaderboardScore({
  score,
  leaderboard,
  highlightedPlayerId,
  beatSaverMap,
  showDropdown = false,
  onDropdownToggle,
  isDropdownExpanded,
  isLoading,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
  beatSaverMap?: BeatSaverMapResponse;
  showDropdown?: boolean;
  onDropdownToggle?: () => void;
  isDropdownExpanded?: boolean;
  isLoading?: boolean;
}) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className="px-4 py-2 whitespace-nowrap">
        <p className={getRankColor(score.rank)}>
          {score.rank !== -1 ? `#${formatNumberWithCommas(score.rank)}` : "-"}
        </p>
      </td>

      {/* Player */}
      <td className="flex min-w-[250px] gap-2 px-4 py-2 whitespace-nowrap">
        <PlayerPreview playerId={scorePlayer.id}>
          <PlayerInfo player={scorePlayer} highlightedPlayerId={highlightedPlayerId} useLink />
        </PlayerPreview>
      </td>

      {/* Time Set */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        <ScoreTimeSet timestamp={score.timestamp} />
      </td>

      {/* Score Accuracy */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
        {formatScoreAccuracy(score.accuracy)}
      </td>

      {/* Score Misses */}
      <td
        className={cn(
          "cursor-default px-4 py-2 whitespace-nowrap",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        <ScoreMissesAndPausesBadge score={score} hideXMark hidePreviousScore />
      </td>

      {/* PP / Score */}
      {leaderboard.stars > 0 ? (
        <td className="text-pp px-4 py-2 whitespace-nowrap">
          <ScorePpBadge score={score} leaderboard={leaderboard} />
        </td>
      ) : (
        <td className="px-4 py-2 text-center whitespace-nowrap">
          <p>{formatNumberWithCommas(score.score)}</p>
        </td>
      )}

      {/* Score Modifiers */}
      <td className="px-4 py-2 text-center whitespace-nowrap">
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
      </td>

      {/* Score Replay */}
      <td className="w-[32px]">
        {score.additionalData && (
          <div className="flex justify-center">
            <ScoreReplayButton additionalData={score.additionalData} />
          </div>
        )}
      </td>

      {showDropdown && (
        <td className="w-[32px]">
          {/* View Leaderboard button */}
          <div className="flex cursor-default items-center justify-center">
            {isLoading ? (
              <ArrowPathIcon className="size-5 animate-spin" />
            ) : (
              <ArrowDownIcon
                className={cn(
                  "size-5 cursor-pointer transition-transform duration-350",
                  isDropdownExpanded ? "" : "rotate-180"
                )}
                onClick={onDropdownToggle}
              />
            )}
          </div>
        </td>
      )}
    </>
  );
}
