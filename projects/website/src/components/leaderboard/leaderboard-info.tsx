import Card from "@/components/card";
import { LeaderboardSongStarCount } from "@/components/leaderboard/leaderboard-song-star-count";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import FallbackLink from "@/components/fallback-link";
import { formatNumber } from "@ssr/common/utils/number-utils";
import Image from "next/image";
import LeaderboardButtons from "@/components/leaderboard/leaderboard-buttons";

type LeaderboardInfoProps = {
  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beat saver map associated with the leaderboard.
   */
  beatSaverMap?: BeatSaverMap;
};

export function LeaderboardInfo({ leaderboard, beatSaverMap }: LeaderboardInfoProps) {
  return (
    <Card className="w-full h-fit">
      <div className="flex flex-row justify-between w-full">
        <div className="flex flex-col justify-between w-full min-h-[160px]">
          <div className="flex justify-between">
            <div>
              <FallbackLink
                href={`https://beatsaver.com/maps/${beatSaverMap?.bsr}`}
                className="hover:brightness-[66%] transform-gpu transition-all"
              >
                <p className="font-semibold">{leaderboard.fullName}</p>
              </FallbackLink>
              <p className="text-sm text-gray-400">
                By <span className="text-ssr">{leaderboard.songAuthorName}</span>
              </p>
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

          <div className="text-sm flex w-full justify-between">
            <div>
              <p>
                Mapper:{" "}
                <FallbackLink href={getBeatSaverMapperProfileUrl(beatSaverMap)}>
                  <span className="text-ssr font-semibold hover:brightness-[66%] transform-gpu transition-all">
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
