import { cn } from "@/common/utils";
import Card from "@/components/card";
import EmbedLinks from "@/components/embed-links";
import FallbackLink from "@/components/fallback-link";
import LeaderboardButtons from "@/components/platform/scoresaber/leaderboard/leaderboard-buttons";
import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/statistic/stat-value";
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
import { formatNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatDate, formatTime } from "@ssr/common/utils/time-utils";
import {
  BombIcon,
  BrickWallIcon,
  DrumIcon,
  GaugeIcon,
  MusicIcon,
  StarIcon,
  TimerIcon,
} from "lucide-react";
import { CubeIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useState } from "react";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver: beatSaverMap } = leaderboard;
  const statusDate = leaderboardData.dateRanked || leaderboardData.dateQualified;

  const descriptionMaxSize = 300;
  const description = beatSaverMap?.description || "";
  const showExpandButton = description.length > descriptionMaxSize;
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="h-fit w-full space-y-4">
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
          <div className="space-y-2">
            {/* Song Name */}
            <FallbackLink
              href={beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap?.bsr}` : undefined}
              className="hover:brightness-66 transition-all"
              data-umami-event="leaderboard-beatsaver-button"
            >
              <h3 className="text-foreground mb-1 line-clamp-2 text-lg font-semibold leading-tight">
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
                <FallbackLink
                  href={getBeatSaverMapperProfileUrl(beatSaverMap)}
                  data-umami-event="leaderboard-mapper-button"
                >
                  <span
                    className={cn(
                      "font-medium",
                      beatSaverMap ? "hover:brightness-66 transition-all" : ""
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

      {/* Star Rating and Status */}
      <div className="flex items-center gap-2">
        {leaderboardData.stars > 0 && (
          <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
            <StarIcon className="h-3 w-3" />
            <span>{leaderboardData.stars.toFixed(2)}</span>
          </div>
        )}

        {leaderboardData.ranked && (
          <div className="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/20 dark:text-green-300">
            <CheckBadgeIcon className="h-3 w-3" />
            <span>Ranked</span>
          </div>
        )}
        {leaderboardData.qualified && !leaderboardData.ranked && (
          <div className="flex items-center gap-1.5 rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">
            <CheckBadgeIcon className="h-3 w-3" />
            <span>Qualified</span>
          </div>
        )}
        {!leaderboardData.ranked && !leaderboardData.qualified && (
          <div className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
            <CheckBadgeIcon className="h-3 w-3" />
            <span>Unranked</span>
          </div>
        )}
      </div>

      {/* Map Stats */}
      {beatSaverMap && beatSaverMap.difficulty && (
        <div className="flex flex-wrap justify-center gap-2">
          <StatValue
            name="Length"
            icon={<TimerIcon className="h-4 w-4" />}
            value={formatTime(beatSaverMap.metadata.duration)}
          />
          <StatValue
            name="BPM"
            icon={<MusicIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaverMap.metadata.bpm)}
          />
          <StatValue
            name="NPS"
            icon={<DrumIcon className="h-4 w-4" />}
            value={beatSaverMap.difficulty.nps.toFixed(2)}
          />
          <StatValue
            name="NJS"
            icon={<GaugeIcon className="h-4 w-4" />}
            value={beatSaverMap.difficulty.njs.toFixed(2)}
          />
          <StatValue
            name="Notes"
            icon={<CubeIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaverMap.difficulty.notes)}
          />
          <StatValue
            name="Bombs"
            icon={<BombIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaverMap.difficulty.bombs)}
          />
          <StatValue
            name="Obstacles"
            icon={<BrickWallIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaverMap.difficulty.obstacles)}
          />
        </div>
      )}

      <Separator />

      {/* Statistics */}
      <div className="bg-muted/30 flex items-center rounded-lg p-3">
        {/* Play Counts */}
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <PlayIcon className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <div className="text-muted-foreground text-xs font-medium">Total Plays</div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold text-blue-500">
                {formatNumber(leaderboardData.plays)}
              </div>
              <div className="text-muted-foreground text-xs">
                ({formatNumber(leaderboardData.dailyPlays)} today
                {leaderboardData.weeklyPlays !== undefined && (
                  <>, {formatNumber(leaderboardData.weeklyPlays)} this week</>
                )}
                )
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Description */}
      {beatSaverMap && description && (
        <div className="bg-muted/30 w-full break-all rounded-lg p-3">
          {(showExpandButton && !expanded
            ? description.slice(0, descriptionMaxSize) + "..."
            : description
          )
            .split("\n")
            .map((line, index) => {
              return (
                <p key={index} className="text-sm">
                  <EmbedLinks text={line} />
                </p>
              );
            })}

          {showExpandButton && (
            <button
              className="text-muted-foreground hover:text-foreground mt-2 text-center text-xs transition-all"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show Less" : "Show More"}
            </button>
          )}
        </div>
      )}

      {/* Information Section */}
      <div className="flex gap-3">
        {/* Status Date */}
        {statusDate && (
          <div className="bg-muted/30 flex-1 rounded-lg p-3">
            <div className="mb-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {leaderboardData.ranked ? "Ranked" : "Qualified"}
              </span>
            </div>
            <SimpleTooltip display={formatDate(statusDate, "Do MMMM, YYYY HH:mm a")}>
              <div className="text-sm font-semibold">{formatDate(statusDate, "Do MM, YYYY")}</div>
            </SimpleTooltip>
          </div>
        )}

        {/* Created Date */}
        <div className="bg-muted/30 flex-1 rounded-lg p-3">
          <div className="mb-1 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
              Created
            </span>
          </div>
          <SimpleTooltip display={formatDate(leaderboardData.timestamp, "Do MMMM, YYYY HH:mm a")}>
            <div className="text-sm font-semibold">
              {formatDate(leaderboardData.timestamp, "Do MM, YYYY")}
            </div>
          </SimpleTooltip>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <LeaderboardButtons leaderboard={leaderboardData} beatSaverMap={beatSaverMap} />
      </div>
    </Card>
  );
}
