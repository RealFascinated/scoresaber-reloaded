import { cn } from "@/common/utils";
import Card from "@/components/card";
import FallbackLink from "@/components/fallback-link";
import LeaderboardButtons from "@/components/platform/scoresaber/leaderboard/leaderboard-buttons";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import Image from "next/image";
import { LeaderboardSongStarCount } from "./leaderboard-song-star-count";

type LeaderboardInfoProps = {
  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beat saver map associated with the leaderboard.
   */
  beatSaverMap?: BeatSaverMapResponse;
};

export function LeaderboardInfo({ leaderboard, beatSaverMap }: LeaderboardInfoProps) {
  let statusDate = leaderboard.dateRanked || leaderboard.dateQualified;
  if (statusDate) {
    statusDate = new Date(statusDate);
  }

  return (
    <Card className="w-full h-fit text-sm">
      <div className="flex flex-row justify-between w-full">
        <div className="flex flex-col justify-between w-full gap-3">
          <div className="flex justify-between">
            <div className="flex flex-col gap-1.5">
              <div>
                {/* Song Name */}
                <FallbackLink
                  href={
                    beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap?.bsr}` : undefined
                  }
                  className="hover:brightness-[66%] transition-all"
                >
                  <p className="font-semibold text-md">{leaderboard.fullName}</p>
                </FallbackLink>

                {/* Song Author */}
                <p className="text-sm text-gray-400">
                  By <span className="text-ssr">{leaderboard.songAuthorName}</span>
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
                        beatSaverMap ? "text-ssr hover:brightness-[66%] transition-all" : ""
                      )}
                    >
                      {leaderboard.levelAuthorName}
                    </span>
                  </FallbackLink>
                </p>

                {/* Play Count */}
                <p>
                  Plays: <span className="font-semibold">{formatNumber(leaderboard.plays)}</span> (
                  {formatNumber(leaderboard.dailyPlays)} today)
                </p>

                {/* Map Status (Ranked, Qualified, etc) */}
                <div className="flex gap-2">
                  Status: <span className="font-semibold">{leaderboard.status}</span>{" "}
                  {statusDate && (
                    <SimpleTooltip display={formatDate(statusDate, "Do MMMM, YYYY")}>
                      <span>({formatDate(statusDate, "Do MMMM, YYYY")})</span>
                    </SimpleTooltip>
                  )}
                </div>

                {/* Leaderboard Creation Date */}
                <p>
                  Created:{" "}
                  <span className="font-semibold">
                    {formatDate(leaderboard.timestamp, "Do MMMM, YYYY")}
                  </span>
                </p>
              </div>
            </div>

            {/* Song Art */}
            <Image
              src={leaderboard.songArt}
              alt={`${leaderboard.songName} Cover Image`}
              className="rounded-md w-[96px] h-[96px]"
              width={96}
              height={96}
            />
          </div>

          <div className="flex justify-between gap-2 items-end">
            <LeaderboardButtons leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
            <LeaderboardSongStarCount leaderboard={leaderboard} />
          </div>
        </div>
      </div>
    </Card>
  );
}
