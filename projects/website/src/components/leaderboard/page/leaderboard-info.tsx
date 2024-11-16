import Card from "@/components/card";
import { LeaderboardSongStarCount } from "@/components/leaderboard/page/leaderboard-song-star-count";
import FallbackLink from "@/components/fallback-link";
import Image from "next/image";
import LeaderboardButtons from "@/components/leaderboard/page/leaderboard-buttons";
import { cn } from "@/common/utils";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";

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
  return (
    <Card className="w-full h-fit text-sm">
      <div className="flex flex-row justify-between w-full">
        <div className="flex flex-col justify-between w-full gap-3">
          <div className="flex justify-between">
            <div className="flex flex-col gap-1.5">
              <div>
                <FallbackLink
                  href={beatSaverMap ? `https://beatsaver.com/maps/${beatSaverMap?.bsr}` : undefined}
                  className="hover:brightness-[66%] transform-gpu transition-all"
                >
                  <p className="font-semibold text-md">{leaderboard.fullName}</p>
                </FallbackLink>
                <p className="text-sm text-gray-400">
                  By <span className="text-ssr">{leaderboard.songAuthorName}</span>
                </p>
              </div>

              <div className="text-[0.8rem]">
                <p>
                  Mapper:{" "}
                  <FallbackLink href={getBeatSaverMapperProfileUrl(beatSaverMap)}>
                    <span
                      className={cn(
                        "font-semibold",
                        beatSaverMap ? "text-ssr hover:brightness-[66%] transform-gpu transition-all" : ""
                      )}
                    >
                      {leaderboard.levelAuthorName}
                    </span>
                  </FallbackLink>
                </p>
                <p>
                  Plays: <span className="font-semibold">{formatNumber(leaderboard.plays)}</span> (
                  {formatNumber(leaderboard.dailyPlays)} today)
                </p>
                <p>
                  Status: <span className="font-semibold">{leaderboard.status}</span>
                </p>
              </div>
            </div>

            <Image
              src={leaderboard.songArt}
              alt={`${leaderboard.songName} Cover Image`}
              className="rounded-md w-[96px] h-[96px]"
              width={96}
              height={96}
              priority
            />
          </div>

          <div className="flex w-full justify-between">
            <div className="flex flex-col justify-end items-end gap-1">
              <LeaderboardSongStarCount leaderboard={leaderboard} />
              <LeaderboardButtons leaderboard={leaderboard} beatSaverMap={beatSaverMap} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
