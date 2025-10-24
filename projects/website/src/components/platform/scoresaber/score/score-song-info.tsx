import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import Image from "next/image";
import LeaderboardPreview from "../leaderboard/leaderboard-preview";
import ScoreSaberSongName from "./song-name";

export default function ScoreSaberScoreSongInfo({
  leaderboard,
  beatSaverMap,
  clickableSongName = true,
  imageSize = 64,
  allowLeaderboardPreview = false,
}: {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  imageSize?: number;
  clickableSongName?: boolean;
  allowLeaderboardPreview?: boolean;
}) {
  const mappersProfile =
    beatSaverMap != undefined
      ? `https://beatsaver.com/profile/${beatSaverMap.author.id}`
      : undefined;

  const starCount = leaderboard.stars;
  const difficulty = getDifficulty(leaderboard.difficulty.difficulty);

  const songNameElement = (
    <ScoreSaberSongName leaderboard={leaderboard} clickableSongName={clickableSongName} />
  );

  const difficultyInfo = (
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
  );

  const authorInfo = (
    <div className="flex flex-row items-end gap-1.5 text-sm leading-none">
      <p className="line-clamp-2 text-gray-400">
        {leaderboard.songAuthorName}{" "}
        <span className="text-song-mapper">
          <FallbackLink
            href={mappersProfile}
            className={cn(
              mappersProfile && "text-xs leading-none transition-all hover:brightness-[66%]"
            )}
          >
            {leaderboard.levelAuthorName}
          </FallbackLink>
        </span>
      </p>
    </div>
  );

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
        <div className="absolute flex h-full w-full items-end justify-center">
          <SimpleTooltip
            side="bottom"
            display={
              <div className="flex flex-col gap-1">
                <div className="flex flex-row gap-1">
                  {leaderboard.difficulties.map(difficulty => {
                    const difficultyLabel =
                      beatSaverMap?.difficultyLabels?.[difficulty.difficulty]?.trim() ?? null;
                    const isSelected =
                      difficulty.difficultyRaw === leaderboard.difficulty.difficultyRaw;

                    return (
                      <SimpleTooltip
                        key={difficulty.leaderboardId}
                        display={getDifficultyName(difficulty.difficulty)}
                      >
                        <p
                          className={cn(
                            isSelected ? "font-semibold" : "",
                            "border-muted rounded-md border p-2 text-xs leading-none"
                          )}
                          style={{
                            backgroundColor:
                              getDifficulty(difficulty.difficulty).color +
                              (isSelected ? "f5" : "20"),
                          }}
                        >
                          {difficultyLabel ?? getDifficultyName(difficulty.difficulty)}
                        </p>
                      </SimpleTooltip>
                    );
                  })}
                </div>
              </div>
            }
          >
            {difficultyInfo}
          </SimpleTooltip>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex flex-col gap-1">
          {allowLeaderboardPreview ? (
            <LeaderboardPreview leaderboard={leaderboard} beatSaverMap={beatSaverMap}>
              {songNameElement}
            </LeaderboardPreview>
          ) : (
            songNameElement
          )}
          {authorInfo}
        </div>
      </div>
    </div>
  );
}
