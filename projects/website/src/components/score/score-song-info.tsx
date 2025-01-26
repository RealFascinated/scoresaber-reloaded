import FallbackLink from "@/components/fallback-link";
import Tooltip from "@/components/tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import Link from "next/link";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  imageSize?: number;
  clickableSongName?: boolean;
};

export default function ScoreSongInfo({ leaderboard, beatSaverMap, clickableSongName = true, imageSize = 64 }: Props) {
  const mappersProfile =
    beatSaverMap != undefined ? `https://beatsaver.com/profile/${beatSaverMap.author.id}` : undefined;

  const starCount = leaderboard.stars;
  const difficulty = leaderboard.difficulty.difficulty;
  return (
    <div className="flex gap-3 items-center break-all">
      <div className={`relative flex justify-center h-[${imageSize}px]`}>
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
          width={imageSize}
          height={imageSize}
          alt={`${leaderboard.fullName}'s Artwork`}
          className={`rounded-md`}
          style={{
            minWidth: `${imageSize}px`,
          }}
          priority
        />
      </div>
      <div className="flex">
        <div className="overflow-y-clip flex flex-col gap-1">
          {clickableSongName ? (
            <Link
              prefetch={false}
              href={`/projects/website/src/app/(pages)/(app)/leaderboard/${leaderboard.id}`}
              className="cursor-pointer select-none hover:brightness-[66%] transform-gpu transition-all text-ssr w-fit"
            >
              {leaderboard.fullName}
            </Link>
          ) : (
            <p className="text-ssr w-fit">{leaderboard.fullName}</p>
          )}
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
