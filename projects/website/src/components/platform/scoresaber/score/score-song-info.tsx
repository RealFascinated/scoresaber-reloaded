import FallbackLink from "@/components/fallback-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import clsx from "clsx";
import Image from "next/image";
import { useMemo } from "react";
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
  const mappersProfile = useMemo(
    () =>
      beatSaverMap != undefined
        ? `https://beatsaver.com/profile/${beatSaverMap.author.id}`
        : undefined,
    [beatSaverMap]
  );

  const starCount = useMemo(() => leaderboard.stars, [leaderboard.stars]);
  const difficulty = useMemo(
    () => getDifficulty(leaderboard.difficulty.difficulty),
    [leaderboard.difficulty.difficulty]
  );

  const songNameElement = useMemo(
    () => <ScoreSaberSongName leaderboard={leaderboard} clickableSongName={clickableSongName} />,
    [leaderboard, clickableSongName]
  );

  const difficultyInfo = useMemo(
    () => (
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
    ),
    [difficulty, starCount]
  );

  const authorInfo = useMemo(
    () => (
      <div className="flex flex-row items-end gap-1.5 text-sm leading-none">
        <p className="text-gray-400">
          {leaderboard.songAuthorName}{" "}
          <span className="text-song-mapper">
            <FallbackLink
              href={mappersProfile}
              className={clsx(
                mappersProfile && "w-fit text-xs leading-none transition-all hover:brightness-[66%]"
              )}
            >
              {leaderboard.levelAuthorName}
            </FallbackLink>
          </span>
        </p>
      </div>
    ),
    [leaderboard.songAuthorName, leaderboard.levelAuthorName, mappersProfile]
  );

  const difficultyLabel = useMemo(
    () => beatSaverMap?.difficultyLabels?.[leaderboard.difficulty.difficulty]?.trim() ?? "",
    [beatSaverMap, leaderboard.difficulty.difficulty]
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
              <div>
                <p>
                  Difficulty: {getDifficultyName(difficulty)}{" "}
                  {difficultyLabel && (
                    <span className="text-xs text-gray-300">({difficultyLabel})</span>
                  )}
                </p>
                <p>Characteristic: {leaderboard.difficulty.characteristic}</p>
                {starCount > 0 && <p>Stars: {starCount.toFixed(2)}</p>}
              </div>
            }
          >
            {difficultyInfo}
          </SimpleTooltip>
        </div>
      </div>
      <div className="flex w-full flex-col gap-1">
        <div className="flex w-full min-w-0 flex-col gap-1 overflow-hidden">
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
