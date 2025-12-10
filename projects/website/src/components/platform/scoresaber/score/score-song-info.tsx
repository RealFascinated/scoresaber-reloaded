import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";
import ScoreSaberSongName from "./song-name";

export default function ScoreSaberScoreSongInfo({
  leaderboard,
  beatSaverMap,
  clickableSongName = true,
  imageSize = 64,
}: {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  imageSize?: number;
  clickableSongName?: boolean;
}) {
  const mappersProfile =
    beatSaverMap != undefined
      ? `https://beatsaver.com/profile/${beatSaverMap.author.id}`
      : undefined;

  const starCount = leaderboard.stars;
  const difficulty = getDifficulty(leaderboard.difficulty.difficulty);

  return (
    <div className="flex w-full items-center gap-3">
      <div
        className="relative flex justify-center"
        style={{
          height: imageSize,
        }}
      >
        <Image
          src={leaderboard.songArt}
          width={imageSize}
          height={imageSize}
          alt={`${leaderboard.fullName}'s Artwork`}
          className="rounded-md"
          style={{
            minWidth: `${imageSize}px`,
          }}
        />
        <div
          className="absolute right-0 bottom-0 flex h-[18px] w-full cursor-default items-center justify-center rounded-sm text-[0.70rem]"
          style={{
            backgroundColor: difficulty.color + "f0",
          }}
        >
          {starCount > 0 ? (
            <div className="flex items-center justify-center gap-1">
              <p>{starCount.toFixed(2)}</p>
              <StarIcon className="h-[14px] w-[14px]" />
            </div>
          ) : (
            <p>{getDifficultyName(difficulty)}</p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-1">
          <ScoreSaberSongName leaderboard={leaderboard} clickableSongName={clickableSongName} />

          {/* Author Info */}
          <div className="flex flex-row items-end gap-1.5 text-sm leading-none">
            <p className="line-clamp-2 text-gray-400">
              {leaderboard.songAuthorName}{" "}
              <span className="text-song-mapper">
                <FallbackLink
                  href={mappersProfile}
                  className={cn(
                    mappersProfile && "hover:text-primary/80 text-xs leading-none transition-all"
                  )}
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
