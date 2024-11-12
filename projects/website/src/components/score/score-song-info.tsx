import FallbackLink from "@/components/fallback-link";
import Tooltip from "@/components/tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMap;
};

export default function ScoreSongInfo({ leaderboard, beatSaverMap }: Props) {
  const mappersProfile =
    beatSaverMap != undefined ? `https://beatsaver.com/profile/${beatSaverMap.author.id}` : undefined;

  const starCount = leaderboard.stars;
  const difficulty = leaderboard.difficulty.difficulty;
  return (
    <div className="flex gap-3 items-center break-all">
      <div className="relative flex justify-center h-[64px]">
        <Tooltip
          display={
            <div>
              <p>Difficulty: {difficulty}</p>
              {starCount > 0 && <p>Stars: {starCount.toFixed(2)}</p>}
            </div>
          }
        >
          <div
            className="absolute w-full h-[18px] bottom-0 right-0 rounded-sm flex justify-center items-center text-[0.70rem] cursor-default"
            style={{
              backgroundColor: getDifficulty(difficulty).color + "f0", // Transparency value (in hex 0-255)
            }}
          >
            {starCount > 0 ? (
              <div className="flex gap-1 items-center justify-center">
                <p>{starCount.toFixed(2)}</p>
                <StarIcon className="w-[14px] h-[14px]" />
              </div>
            ) : (
              <p>{getDifficultyName(difficulty)}</p>
            )}
          </div>
        </Tooltip>
        <Image
          src={leaderboard.songArt}
          width={64}
          height={64}
          alt={`${leaderboard.fullName}'s Artwork`}
          className="rounded-md min-w-[64px]"
          priority
        />
      </div>
      <div className="flex">
        <div className="overflow-y-clip flex flex-col gap-1">
          <Link
            prefetch={false}
            href={`/leaderboard/${leaderboard.id}`}
            className="cursor-pointer select-none hover:brightness-[66%] transform-gpu transition-all text-ssr w-fit"
          >
            {leaderboard.fullName}
          </Link>
          <div className="flex flex-row text-sm gap-1.5 items-end leading-none">
            <p className="text-gray-400">
              {leaderboard.songAuthorName}{" "}
              <span className="text-primary">
                <FallbackLink
                  href={mappersProfile}
                  className={
                    mappersProfile && "hover:brightness-[66%] transform-gpu transition-all w-fit text-xs leading-none"
                  }
                >
                  {leaderboard.levelAuthorName}
                </FallbackLink>
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
