import { cn } from "@/common/utils";
import Card from "@/components/card";
import FallbackLink from "@/components/fallback-link";
import LeaderboardButtons from "@/components/platform/scoresaber/leaderboard/leaderboard-buttons";
import SimpleTooltip from "@/components/simple-tooltip";
import { LeaderboardResponse } from "@ssr/common/response/leaderboard-response";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import Image from "next/image";
import { LeaderboardSongStarCount } from "./leaderboard-song-star-count";

type LeaderboardInfoProps = {
  leaderboard: LeaderboardResponse;
};

export function LeaderboardInfo({ leaderboard }: LeaderboardInfoProps) {
  const { leaderboard: leaderboardData, beatsaver: beatSaverMap } = leaderboard;
  let statusDate = leaderboardData.dateRanked || leaderboardData.dateQualified;
  if (statusDate) {
    statusDate = new Date(statusDate);
  }

  return (
    <Card className="h-fit w-full text-sm 2xl:w-[405px]">
      <div className="flex w-full flex-row justify-between">
        <div className="flex w-full flex-col justify-between gap-3">
          <div className="flex justify-between">
            <div className="flex flex-col gap-1.5">
              <div>
                {/* Song Name */}
                <FallbackLink
                  href={
                    beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap?.bsr}` : undefined
                  }
                  className="transition-all hover:brightness-[66%]"
                >
                  <p className="text-md font-semibold">{leaderboardData.fullName}</p>
                </FallbackLink>

                {/* Song Author */}
                <p className="text-sm text-gray-400">
                  By <span className="text-primary">{leaderboardData.songAuthorName}</span>
                </p>
              </div>

              <div className="text-[0.8rem]">
                {/* Mapper */}
                <p>
                  Mapper:{" "}
                  <FallbackLink href={getBeatSaverMapperProfileUrl(beatSaverMap)}>
                    <span
                      className={cn(
                        "font-semibold",
                        beatSaverMap ? "text-primary transition-all hover:brightness-[66%]" : ""
                      )}
                    >
                      {leaderboardData.levelAuthorName}
                    </span>
                  </FallbackLink>
                </p>

                {/* Play Count */}
                <p>
                  Plays:{" "}
                  <span className="font-semibold">{formatNumber(leaderboardData.plays)}</span> (
                  {formatNumber(leaderboardData.dailyPlays)} today)
                </p>

                {/* Map Status (Ranked, Qualified, etc) */}
                <div className="flex gap-2">
                  {statusDate ? (
                    <SimpleTooltip display={formatDate(statusDate, "Do MMMM, YYYY")}>
                      Status: <span className="font-semibold">{leaderboardData.status}</span>
                    </SimpleTooltip>
                  ) : (
                    <p>
                      Status: <span className="font-semibold">{leaderboardData.status}</span>
                    </p>
                  )}
                </div>

                {/* Leaderboard Creation Date */}
                <p>
                  Created:{" "}
                  <span className="font-semibold">
                    {formatDate(leaderboardData.timestamp, "Do MMMM, YYYY")}
                  </span>
                </p>
              </div>
            </div>

            {/* Song Art */}
            <Image
              src={leaderboardData.songArt}
              alt={`${leaderboardData.songName} Cover Image`}
              className="h-[96px] w-[96px] rounded-md"
              width={96}
              height={96}
            />
          </div>

          <div className="flex items-end justify-between gap-2">
            <LeaderboardButtons leaderboard={leaderboardData} beatSaverMap={beatSaverMap} />
            <LeaderboardSongStarCount leaderboard={leaderboardData} />
          </div>
        </div>
      </div>
    </Card>
  );
}
