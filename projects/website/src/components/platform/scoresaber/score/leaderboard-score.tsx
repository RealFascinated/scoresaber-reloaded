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
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";

export default function ScoreSaberLeaderboardScore({
  score,
  leaderboard,
  highlightedPlayerId,
  showDropdown = false,
  onDropdownToggle,
  isDropdownExpanded,
  isLoading,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
  showDropdown?: boolean;
  onDropdownToggle?: () => void;
  isDropdownExpanded?: boolean;
  isLoading?: boolean;
}) {
  const scorePlayer = score.playerInfo;

  return (
    <>
      {/* Score Rank */}
      <td className="whitespace-nowrap px-4 py-2">
        <p className={getRankColor(score.rank)}>
          {score.rank !== -1 ? `#${formatNumberWithCommas(score.rank)}` : "-"}
        </p>
      </td>

      {/* Player */}
      <td className="flex min-w-[250px] gap-2 whitespace-nowrap px-4 py-2">
        {scorePlayer ? (
          <PlayerPreview playerId={scorePlayer.id}>
            <PlayerInfo player={scorePlayer} highlightedPlayerId={highlightedPlayerId} useLink />
          </PlayerPreview>
        ) : (
          <p className="text-gray-500">Unknown Player</p>
        )}
      </td>

      {/* Time Set */}
      <td className="whitespace-nowrap px-4 py-2 text-center">
        <ScoreTimeSet timestamp={score.timestamp} />
      </td>

      {/* Score Accuracy */}
      <td className="whitespace-nowrap px-4 py-2 text-center">
        {formatScoreAccuracy(score.accuracy)}
      </td>

      {/* Score Misses */}
      <td
        className={cn(
          "cursor-default whitespace-nowrap px-4 py-2",
          score.misses > 0 ? "text-red-500" : "text-green-500"
        )}
      >
        <ScoreMissesAndPausesBadge score={score} hideXMark hidePreviousScore />
      </td>

      {/* PP / Score */}
      {leaderboard.stars > 0 ? (
        <td className="text-pp whitespace-nowrap px-4 py-2">
          <ScorePpBadge score={score} leaderboard={leaderboard} />
        </td>
      ) : (
        <td className="whitespace-nowrap px-4 py-2 text-center">
          <p>{formatNumberWithCommas(score.score)}</p>
        </td>
      )}

      {/* Score Modifiers */}
      <td className="whitespace-nowrap px-4 py-2 text-center">
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
                  "duration-350 size-5 cursor-pointer transition-transform",
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
