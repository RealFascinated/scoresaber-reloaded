import { cn } from "@/common/utils";
import Card from "@/components/card";
import FallbackLink from "@/components/fallback-link";
import LeaderboardButtons from "@/components/platform/scoresaber/leaderboard/leaderboard-buttons";
import SimpleTooltip from "@/components/simple-tooltip";
import { Separator } from "@/components/ui/separator";
import {
  ChartBarIcon,
  CheckBadgeIcon,
  MapIcon,
  MusicalNoteIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import Image from "next/image";
import { LeaderboardStarBadge } from "./leaderboard-star-badge";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver: beatSaverMap } = leaderboard;
  const statusDate = leaderboardData.dateRanked || leaderboardData.dateQualified;
  const difficultyInfo = getDifficulty(leaderboardData.difficulty.difficulty);

  return (
    <Card className="h-fit w-full space-y-3 2xl:w-[420px]">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        {/* Song Art */}
        <Image
          src={leaderboardData.songArt}
          alt={`${leaderboardData.songName} Cover Image`}
          className="h-20 w-20 rounded-lg object-cover shadow-sm"
          width={80}
          height={80}
        />

        {/* Song Info */}
        <div className="min-w-0 flex-1">
          <div className="space-y-1.5">
            {/* Song Name */}
            <FallbackLink
              href={beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap?.bsr}` : undefined}
              className="transition-all hover:brightness-[66%]"
            >
              <h3 className="text-foreground mb-1 line-clamp-2 text-xl leading-tight font-bold">
                {leaderboardData.fullName}
              </h3>
            </FallbackLink>

            {/* Song Author */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
                <MusicalNoteIcon className="h-3 w-3" />
                <span>{leaderboardData.songAuthorName}</span>
              </div>
            </div>

            {/* Mapper */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-300">
                <MapIcon className="h-3 w-3" />
                <FallbackLink href={getBeatSaverMapperProfileUrl(beatSaverMap)}>
                  <span
                    className={cn(
                      "font-medium",
                      beatSaverMap ? "transition-all hover:brightness-[66%]" : ""
                    )}
                  >
                    {leaderboardData.levelAuthorName}
                  </span>
                </FallbackLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status and Star Rating */}
      <div className="flex items-center justify-between">
        {/* Star Rating */}
        <LeaderboardStarBadge leaderboard={leaderboardData} />

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          {leaderboardData.ranked && (
            <div className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-3 text-xs font-semibold text-white shadow-sm">
              <CheckBadgeIcon className="h-3.5 w-3.5" />
              Ranked
            </div>
          )}
          {leaderboardData.qualified && !leaderboardData.ranked && (
            <div className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 px-3 text-xs font-semibold text-white shadow-sm">
              <CheckBadgeIcon className="h-3.5 w-3.5" />
              Qualified
            </div>
          )}
          {!leaderboardData.ranked && !leaderboardData.qualified && (
            <div className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 px-3 text-xs font-semibold text-white shadow-sm">
              <CheckBadgeIcon className="h-3.5 w-3.5" />
              Unranked
            </div>
          )}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Play Counts */}
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <PlayIcon className="h-4 w-4" />
            <span>Total Plays</span>
          </div>
          <p className="text-lg font-semibold">{formatNumber(leaderboardData.plays)}</p>
          <div className="text-muted-foreground space-y-0.5 text-xs">
            <p>{formatNumber(leaderboardData.dailyPlays)} today</p>
            {leaderboardData.weeklyPlays !== undefined && (
              <p>{formatNumber(leaderboardData.weeklyPlays)} this week</p>
            )}
          </div>
        </div>

        {/* Max Score */}
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <ChartBarIcon className="h-4 w-4" />
            <span>Max Score</span>
          </div>
          <p className="text-lg font-semibold">{formatNumber(leaderboardData.maxScore)}</p>
        </div>
      </div>

      <Separator />

      {/* Information Section */}
      <div className="space-y-1.5">
        <div className="space-y-1.5 text-sm">
          {/* Status Date */}
          {statusDate && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">
                Date {leaderboardData.ranked ? "Ranked" : "Qualified"}
              </span>
              <SimpleTooltip display={formatDate(statusDate, "Do MMMM, YYYY HH:mm a")}>
                <span className="font-medium">{formatDate(statusDate, "DD MMMM YYYY")}</span>
              </SimpleTooltip>
            </div>
          )}

          {/* Created Date */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Leaderboard Created</span>
            <SimpleTooltip display={formatDate(leaderboardData.timestamp, "Do MMMM, YYYY HH:mm a")}>
              <span className="font-medium">
                {formatDate(leaderboardData.timestamp, "DD MMMM YYYY")}
              </span>
            </SimpleTooltip>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <LeaderboardButtons leaderboard={leaderboardData} beatSaverMap={beatSaverMap} />
      </div>
    </Card>
  );
}
