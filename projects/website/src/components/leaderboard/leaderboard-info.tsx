import Card from "@/components/card";
import { LeaderboardSongStarCount } from "@/components/leaderboard/leaderboard-song-star-count";
import ScoreButtons from "@/components/score/score-buttons";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { getBeatSaverMapperProfileUrl } from "@ssr/common/utils/beatsaver.util";
import FallbackLink from "@/components/fallback-link";
import { formatNumber } from "@ssr/common/utils/number-utils";
import Image from "@/components/image";

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
          {/* Song Info */}
          <div className="flex flex-col gap-1">
            <FallbackLink
              href={`https://beatsaver.com/maps/${beatSaverMap?.bsr}`}
              className="hover:brightness-[66%] transform-gpu transition-all"
            >
              <p className="font-semibold">
                {leaderboard.songName} {leaderboard.songSubName}
              </p>
            </FallbackLink>
            <p className="text-sm text-gray-400">
              By <span className="text-ssr">{leaderboard.songAuthorName}</span>
            </p>
          </div>

          {/* Song Stats */}
          <div className="text-sm">
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
        </div>
        <Image
          src={leaderboard.songArt}
          alt={`${leaderboard.songName} Cover Image`}
          className="rounded-md w-[96px] h-[96px]"
          size={96}
        />

        <div className="relative">
          <div className="absolute bottom-0 right-0 w-fit h-fit flex flex-col gap-2 items-end">
            <LeaderboardSongStarCount leaderboard={leaderboard} />
            <ScoreButtons leaderboard={leaderboard} beatSaverMap={beatSaverMap} alwaysSingleLine />
          </div>
        </div>
      </div>
    </Card>
  );
}
