import BeatSaverMap from "@/common/database/types/beatsaver-map";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import { getDifficultyFromScoreSaberDifficulty } from "@/common/scoresaber-utils";
import { songDifficultyToColor } from "@/common/song-utils";
import FallbackLink from "@/components/fallback-link";
import Tooltip from "@/components/tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import Image from "next/image";

type Props = {
  leaderboard: ScoreSaberLeaderboardToken;
  beatSaverMap?: BeatSaverMap;
};

export default function ScoreSongInfo({ leaderboard, beatSaverMap }: Props) {
  const diff = getDifficultyFromScoreSaberDifficulty(
    leaderboard.difficulty.difficulty,
  );
  const mappersProfile =
    beatSaverMap != undefined
      ? `https://beatsaver.com/profile/${beatSaverMap?.fullData.uploader.id}`
      : undefined;

  return (
    <div className="flex gap-3 items-center">
      <div className="relative flex justify-center h-[64px]">
        <Tooltip
          display={
            <>
              <p>
                Difficulty: <span className="font-bold">{diff}</span>
              </p>
              {leaderboard.stars > 0 && (
                <p>
                  Stars: <span className="font-bold">{leaderboard.stars}</span>
                </p>
              )}
            </>
          }
        >
          <div
            className="absolute w-full h-[20px] bottom-0 right-0 rounded-sm flex justify-center items-center text-xs cursor-default"
            style={{
              backgroundColor: songDifficultyToColor(diff) + "f0", // Transparency value (in hex 0-255)
            }}
          >
            {leaderboard.stars > 0 ? (
              <div className="flex gap-1 items-center justify-center">
                <p>{leaderboard.stars}</p>
                <StarIcon className="w-4 h-4" />
              </div>
            ) : (
              <p>{diff}</p>
            )}
          </div>
        </Tooltip>
        <Image
          unoptimized
          src={`https://img.fascinated.cc/upload/w_64,h_64/${leaderboard.coverImage}`}
          width={64}
          height={64}
          alt="Song Artwork"
          className="rounded-md min-w-[64px]"
          priority
        />
      </div>
      <div className="flex">
        <div className="overflow-y-clip">
          <p className="text-pp">
            {leaderboard.songName} {leaderboard.songSubName}
          </p>
          <p className="text-sm text-gray-400">{leaderboard.songAuthorName}</p>
          <FallbackLink href={mappersProfile}>
            <p
              className={clsx(
                "text-sm",
                mappersProfile &&
                  "hover:brightness-75 transform-gpu transition-all",
              )}
            >
              {leaderboard.levelAuthorName}
            </p>
          </FallbackLink>
        </div>
      </div>
    </div>
  );
}
