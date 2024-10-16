import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { getDifficultyFromScoreSaberDifficulty } from "@ssr/common/utils/scoresaber-utils";
import FallbackLink from "@/components/fallback-link";
import Tooltip from "@/components/tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { songDifficultyToColor } from "@/common/song-utils";
import Link from "next/link";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";

type Props = {
  leaderboard: ScoreSaberLeaderboardToken;
  beatSaverMap?: BeatSaverMap;
};

export default function ScoreSongInfo({ leaderboard, beatSaverMap }: Props) {
  const diff = getDifficultyFromScoreSaberDifficulty(leaderboard.difficulty.difficulty);
  const mappersProfile =
    beatSaverMap != undefined ? `https://beatsaver.com/profile/${beatSaverMap?.fullData.uploader.id}` : undefined;

  const starCount = leaderboard.stars;
  return (
    <div className="flex gap-3 items-center">
      <div className="relative flex justify-center h-[64px]">
        <Tooltip
          display={
            <>
              <p>Difficulty: {diff}</p>
              {starCount > 0 && <p>Stars: {starCount.toFixed(2)}</p>}
            </>
          }
        >
          <div
            className="absolute w-full h-[18px] bottom-0 right-0 rounded-sm flex justify-center items-center text-[0.70rem] cursor-default"
            style={{
              backgroundColor: songDifficultyToColor(diff) + "f0", // Transparency value (in hex 0-255)
            }}
          >
            {starCount > 0 ? (
              <div className="flex gap-1 items-center justify-center">
                <p>{starCount.toFixed(2)}</p>
                <StarIcon className="w-[14px] h-[14px]" />
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
          <Link
            href={`/leaderboard/${leaderboard.id}`}
            className="cursor-pointer select-none hover:brightness-75 transform-gpu transition-all text-pp w-fit"
          >
            {leaderboard.songName} {leaderboard.songSubName}
          </Link>
          <div className="flex flex-col text-sm">
            <p className="text-gray-400">{leaderboard.songAuthorName}</p>
            <FallbackLink
              href={mappersProfile}
              className={mappersProfile && "hover:brightness-75 transform-gpu transition-all w-fit"}
            >
              {leaderboard.levelAuthorName}
            </FallbackLink>
          </div>
        </div>
      </div>
    </div>
  );
}
