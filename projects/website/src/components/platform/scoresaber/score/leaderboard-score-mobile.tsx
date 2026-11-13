import { getRankColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import Avatar from "@/components/avatar";
import ScoreMissesAndPausesBadge from "@/components/platform/scoresaber/score/badges/score-misses-and-pauses";
import { ScorePpBadge } from "@/components/platform/scoresaber/score/badges/score-pp";
import { ScoreSaberScoreModifiers } from "@/components/platform/scoresaber/score/score-modifiers";
import { ScoreTimeSet } from "@/components/score/score-time-set";
import SimpleLink from "@/components/simple-link";
import { Spinner } from "@/components/spinner";
import { SharedIcons } from "@/shared-icons";
import { getHMDInfo } from "@ssr/common/hmds";
import type { HMD } from "@ssr/common/schemas/hmd";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatScoreAccuracy } from "@ssr/common/utils/score.util";
import { useState } from "react";
import ScoreDetailsDropdown from "./score-details-dropdown";
import { ScoreSaberScoreHMD } from "./score-hmd";

/**
 * Compact leaderboard row for mobile. The song is the same for every row on a leaderboard,
 * so it shows only what differs between players.
 */
export default function ScoreSaberLeaderboardScoreMobile({
  score,
  leaderboard,
  highlightedPlayerId,
}: {
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  highlightedPlayerId?: string;
}) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);

  const [prevScoreId, setPrevScoreId] = useState(score.scoreId);
  if (prevScoreId !== score.scoreId) {
    setPrevScoreId(score.scoreId);
    setDetailsExpanded(false);
  }

  const scorePlayer = score.playerInfo;
  const hmd = getHMDInfo(score.hmd as HMD);
  const isRanked = leaderboard.stars > 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-2 py-2",
        highlightedPlayerId === score.playerId && "bg-primary/10"
      )}
    >
      <div className="flex items-center gap-2">
        <p
          className={cn(
            "min-w-9 shrink-0 text-base font-bold tabular-nums",
            score.rank !== -1 && getRankColor(score.rank)
          )}
        >
          {score.rank !== -1 ? `#${formatNumberWithCommas(score.rank)}` : "#-"}
        </p>

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar
              src={scorePlayer?.avatar ?? ""}
              alt={`${scorePlayer?.name ?? "Unknown"}'s Profile Picture`}
              size={20}
              className="shrink-0"
            />
            {scorePlayer ? (
              <SimpleLink
                href={`/player/${score.playerId}`}
                className="hover:text-primary truncate text-sm font-medium transition-colors"
              >
                {scorePlayer.name}
              </SimpleLink>
            ) : (
              <p className="text-muted-foreground text-sm">Unknown Player</p>
            )}
            {hmd.logo && (
              <ScoreSaberScoreHMD score={score}>
                <span className="flex shrink-0 items-center">
                  <SharedIcons.HeadMountedDisplayIcon hmd={hmd} />
                </span>
              </ScoreSaberScoreHMD>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <ScoreTimeSet timestamp={score.timestamp} />
            {score.modifiers.length > 0 && <ScoreSaberScoreModifiers type="simple" score={score} />}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end text-sm tabular-nums">
          {isRanked ? (
            <span className="text-pp font-medium">
              <ScorePpBadge score={score} leaderboard={leaderboard} />
            </span>
          ) : (
            <span className="font-medium">{formatNumberWithCommas(score.score)}</span>
          )}
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span>{formatScoreAccuracy(score.accuracy)}</span>
            <span className="text-border">•</span>
            <span className={score.misses > 0 ? "text-danger" : "text-success"}>
              <ScoreMissesAndPausesBadge score={score} hideXMark hidePreviousScore />
            </span>
          </div>
        </div>

        {score.beatLeaderScore && (
          <button
            className="size-6 shrink-0 cursor-pointer"
            aria-label="View score details"
            onClick={() => setDetailsExpanded(!detailsExpanded)}
          >
            {isDetailsLoading ? (
              <Spinner size="sm" />
            ) : (
              <SharedIcons.ExpandLeaderboardRowIcon
                className={cn(
                  "size-6 transition-transform duration-200",
                  detailsExpanded ? "" : "rotate-180"
                )}
              />
            )}
          </button>
        )}
      </div>

      {detailsExpanded && (
        <ScoreDetailsDropdown
          score={score}
          leaderboard={leaderboard}
          highlightedPlayerId={highlightedPlayerId}
          showLeaderboardScores={false}
          isLoading={setIsDetailsLoading}
          isExpanded
          isLeaderboardScore
        />
      )}
    </div>
  );
}
