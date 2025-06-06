import FallbackLink from "@/components/fallback-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { StarIcon } from "@heroicons/react/24/solid";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import Image from "next/image";
import LeaderboardPreview from "../leaderboard/leaderboard-preview";
import SongName from "./song-name";

type Props = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  imageSize?: number;
  clickableSongName?: boolean;
  allowLeaderboardPreview?: boolean;
};

export default function ScoreSongInfo({
  leaderboard,
  beatSaverMap,
  clickableSongName = true,
  imageSize = 64,
  allowLeaderboardPreview = false,
}: Props) {
  const mappersProfile =
    beatSaverMap != undefined
      ? `https://beatsaver.com/profile/${beatSaverMap.author.id}`
      : undefined;

  const starCount = leaderboard.stars;
  const difficulty = getDifficulty(leaderboard.difficulty.difficulty);
  return (
    <div className="flex gap-3 items-center break-all w-full">
      <div
        className="relative flex justify-center"
        style={{
          height: imageSize,
        }}
      >
        <SimpleTooltip
          display={
            <div>
              <p>Difficulty: {getDifficultyName(difficulty)}</p>
              {starCount > 0 && <p>Stars: {starCount.toFixed(2)}</p>}
            </div>
          }
        >
          <div
            className="absolute w-full h-[18px] bottom-0 right-0 rounded-sm flex justify-center items-center text-[0.70rem] cursor-default"
            style={{
              backgroundColor: difficulty.color + "f0", // Transparency value (in hex 0-255)
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
        </SimpleTooltip>
        <Image
          src={leaderboard.songArt}
          width={imageSize}
          height={imageSize}
          alt={`${leaderboard.fullName}'s Artwork`}
          className={`rounded-md`}
          style={{
            minWidth: `${imageSize}px`,
          }}
        />
      </div>
      <div className="flex">
        <div className="overflow-y-clip flex flex-col gap-1 min-w-0 w-full">
          {allowLeaderboardPreview ? (
            <LeaderboardPreview leaderboard={leaderboard} beatSaverMap={beatSaverMap}>
              <SongName leaderboard={leaderboard} clickableSongName={clickableSongName} />
            </LeaderboardPreview>
          ) : (
            <SongName leaderboard={leaderboard} clickableSongName={clickableSongName} />
          )}

          <div className="flex flex-row text-sm gap-1.5 items-end leading-none">
            <p className="text-gray-400">
              {leaderboard.songAuthorName}{" "}
              <span className="text-primary">
                <FallbackLink
                  href={mappersProfile}
                  className={
                    mappersProfile &&
                    "hover:brightness-[66%] transform-gpu transition-all w-fit text-xs leading-none"
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
