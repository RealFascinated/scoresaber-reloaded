import Card from "@/components/card";
import EmbedLinks from "@/components/embed-links";
import FallbackLink from "@/components/fallback-link";
import LeaderboardButtons from "@/components/platform/scoresaber/leaderboard/leaderboard-buttons";
import SimpleTooltip from "@/components/simple-tooltip";
import { Separator } from "@/components/ui/separator";
import { StarFilledIcon } from "@radix-ui/react-icons";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import Image from "next/image";
import { useState } from "react";
import { LeaderboardStatus } from "./leaderboard-status";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver: beatSaverMap } = leaderboard;

  const descriptionMaxSize = 300;
  const description = beatSaverMap?.description || "";
  const showExpandButton = description.length > descriptionMaxSize;
  const [expanded, setExpanded] = useState(false);

  const statusDate = leaderboard.leaderboard.ranked
    ? leaderboardData.timestamp
    : leaderboardData.dateRanked || leaderboardData.timestamp;

  const difficulty = getDifficulty(leaderboardData.difficulty.difficulty);

  return (
    <Card className="h-fit w-full space-y-4">
      {/* Header Section */}
      <div className="flex items-start justify-between gap-4">
        {/* Song Info */}
        <div className="flex h-full flex-col justify-center gap-3">
          {/* Star Count / Difficulty */}
          <div
            className="flex w-fit items-center gap-1 rounded-md p-1.5 py-1"
            style={{ backgroundColor: difficulty.color }}
          >
            {leaderboard.leaderboard.ranked ? (
              <>
                <StarFilledIcon className="h-[15px] w-[15px] text-white" />
                <p className="text-xs font-semibold text-white">
                  {leaderboardData.stars.toFixed(2)}
                </p>
              </>
            ) : (
              <p className="text-xs font-semibold text-white">
                {getDifficultyName(leaderboardData.difficulty.difficulty)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            {/* Song Name */}
            <FallbackLink
              href={beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap?.bsr}` : undefined}
              className="hover:text-primary/80 transition-all"
              data-umami-event="leaderboard-beatsaver-button"
            >
              <h3 className="text-song-name line-clamp-2 text-lg leading-tight font-semibold">
                {leaderboardData.fullName}
              </h3>
            </FallbackLink>

            <span className="text-muted-foreground text-sm">{leaderboardData.songAuthorName}</span>
          </div>
        </div>

        {/* Song Art */}
        <Image
          src={leaderboardData.songArt}
          alt={`${leaderboardData.songName} Cover Image`}
          className="rounded-lg object-cover"
          width={96}
          height={96}
        />
      </div>

      <Separator />

      {/* Leaderboard Info */}
      <div className="flex flex-col gap-3">
        {/* Mapped by */}
        <LeaderboardInfoItem
          label="Mapped by"
          value={
            <FallbackLink
              href={getBeatSaverMapperProfileUrl(beatSaverMap)}
              className="hover:text-primary/80 transition-all"
              data-umami-event="leaderboard-mapper-button"
            >
              {leaderboardData.levelAuthorName}
            </FallbackLink>
          }
        />

        {/* Plays */}
        <LeaderboardInfoItem
          label="Plays"
          value={
            <p>
              {formatNumberWithCommas(leaderboardData.plays)}{" "}
              <span className="text-muted-foreground">
                ({leaderboardData.dailyPlays} in the last 24h)
              </span>
            </p>
          }
        />

        {/* Ranked / Created Date */}
        <LeaderboardInfoItem
          label={leaderboard.leaderboard.ranked ? "Ranked" : "Created"}
          value={
            <SimpleTooltip display={formatDate(statusDate, "Do MMMM, YYYY HH:mm a")}>
              {formatDate(statusDate, "Do MMMM, YYYY")}
            </SimpleTooltip>
          }
        />

        {/* Status */}
        <LeaderboardInfoItem
          label="Status"
          value={<LeaderboardStatus leaderboard={leaderboard.leaderboard} />}
        />
      </div>

      <Separator />

      {/* Map Description */}
      {beatSaverMap && description && (
        <div className="bg-muted/30 w-full rounded-lg p-3 break-all">
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

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-2">
        <LeaderboardButtons leaderboard={leaderboardData} beatSaverMap={beatSaverMap} />
      </div>
    </Card>
  );
}

function LeaderboardInfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-h-6 flex-wrap items-start gap-2">
      <p className="text-muted-foreground min-w-[100px] shrink-0 text-sm">{label}:</p>
      <div className="text-foreground max-w-full min-w-0 text-sm *:wrap-break-word">{value}</div>
    </div>
  );
}
