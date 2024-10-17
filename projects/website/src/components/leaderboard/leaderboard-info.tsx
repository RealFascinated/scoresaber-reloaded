import Card from "@/components/card";
import Image from "next/image";
import { LeaderboardSongStarCount } from "@/components/leaderboard/leaderboard-song-star-count";
import ScoreButtons from "@/components/score/score-buttons";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/beatsaver-map";

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
    <Card className="xl:w-[500px] h-fit w-full">
      <div className="flex flex-row justify-between w-full">
        <div className="flex flex-col justify-between w-full min-h-[160px]">
          {/* Song Info */}
          <div className="flex flex-col gap-1">
            <p className="font-semibold">
              {leaderboard.songName} {leaderboard.songSubName}
            </p>
            <p className="text-sm text-gray-400">
              By <span className="text-pp">{leaderboard.songAuthorName}</span>
            </p>
          </div>

          {/* Song Stats */}
          <div className="text-sm">
            <p>
              Mapper: <span className="text-pp font-semibold">{leaderboard.levelAuthorName}</span>
            </p>
            <p>
              Plays: <span className="font-semibold">{leaderboard.plays}</span> ({leaderboard.dailyPlays} today)
            </p>
            <p>
              Status: <span className="font-semibold">{leaderboard.stars > 0 ? "Ranked" : "Unranked"}</span>
            </p>
          </div>
        </div>
        <Image
          src={leaderboard.songArt}
          alt={`${leaderboard.songName} Cover Image`}
          className="rounded-md w-[96px] h-[96px]"
          width={96}
          height={96}
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
